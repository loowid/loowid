#!/bin/bash

#
# OPENSHIFT_MONIT_REPAIR: Repair mode
#	0: Only send advices.
#	1: Send advices and restart services. 
#	2: Restart services and also try to repair mongo.
# OPENSHIFT_MONIT_MONGOQUOTA: Percentage of storage quota for mongodb gear to send advices.
# OPENSHIFT_MONIT_MONGOMAXQUOTA: Percentage of storage quota for mongodb gear to try to repair db (if repair is set to 2).
# OPENSHIFT_MONIT_INODEQUOTA: Percentage of inode quota for any gear to send advices.
# OPENSHIFT_MONIT_SLACK_WEBHOOK: Slack WebHook Path to send advices to slack via incoming webhook connector.
# OPENSHIFT_MONGODB_DB_USERNAME: Root Mongodb administrator
# OPENSHIFT_MONGODB_DB_PASSWORD: Root Mongodb password
# OPENSHIFT_DB_AUTH: Database where root users needs to auth
# OPENSHIFT_DB_TOREPAIR: Database name that has to be repaired


OPENSHIFT_MONIT_INODEQUOTA=80.0
OPENSHIFT_MONIT_MONGOMAXQUOTA=71.0
OPENSHIFT_MONIT_MONGOQUOTA=70.0
OPENSHIFT_MONIT_REPAIR=2
OPENSHIFT_MONIT_SLACK_WEBHOOK=
OPENSHIFT_MONGODB_DB_USERNAME=
OPENSHIFT_MONGODB_DB_PASSWORD=
OPENSHIFT_DB_AUTH=
OPENSHIFT_DB_TOREPAIR=

export PATH=/usr/local/bin/:$PATH

# Utilities
float_test () { 
    awk 'END { exit ( !( '"$1"')); }' < /dev/null
}

# Slack advices
slack() {
	curl -X POST --data-urlencode 'payload={"channel": "#general", "username": "monit", "text": "'"$1"'", "icon_emoji": ":warning:"}' https://hooks.slack.com/services/${OPENSHIFT_MONIT_SLACK_WEBHOOK} >/dev/null 2>&1
}

# Mongo Query
mongoquery () {
         docker-compose -f /root/server/docker-compose.yml exec -T mongodb mongo -u $OPENSHIFT_MONGODB_DB_USERNAME -p $OPENSHIFT_MONGODB_DB_PASSWORD $OPENSHIFT_DB_AUTH --eval "$1"|tail -1
}

# Checking MONGODB Available
checkMongoUp () {
	mongoup=$(mongoquery "db.runCommand('use $OPENSHIFT_DB_TOREPAIR');db.rooms.find().count();");
    	if [[ $mongoup =~ "''|*[!0-9]*|*db_1)" ]]; then 
		slack "Warning: Mongo is down in ${OPENSHIFT_DB_TOREPAIR}";
		if float_test "${OPENSHIFT_MONIT_REPAIR} > 0"; then
			slack "Restarting Mongo in ${OPENSHIFT_DB_TOREPAIR} automatically.";
			docker-compose -f /root/server/docker-compose.yml stop mongodb;
			docker-compose -f /root/server/docker-compose.yml start mongodb;
			echo "Restarting mongo"
		fi;
	fi;
}

# Checking MONGODB Usage
checkQuota () {

         output=$(df -H | grep '^/dev/sda1' | awk '{ print $5 " " $1 }');	
	 usep=$(echo $output | awk '{ print $1}' | cut -d'%' -f1  )
	 partition=$(echo $output | awk '{ print $2 }' )

         if float_test "${usep:-0} > $1"; then
		slack "Warning: Mongo in ${OPENSHIFT_DB_TOREPAIR} is using ${usep}% of disk limit";
		if float_test "${OPENSHIFT_MONIT_REPAIR} == 2"; then
			if float_test "${usep:-0} > $2"; then
				echo "Reparing mongo"
				mongoquery "db.runCommand('use $OPENSHIFT_DB_TOREPAIR');db.logs.remove({});db.sessions.remove({});db.repairDatabase();";
				newusage=$(echo $output | awk '{ print $1}' | cut -d'%' -f1  )
				slack "Repaired: Mongo in ${OPENSHIFT_DB_TOREPAIR} now is using ${newusage}% of disk limit";
			fi;
		fi;
	fi;
}

checkWebStatus () {
	upweb=$(wget -O - https://www.loowid.com/ 2>/dev/null | grep 'loowidVersion' | wc -l);
	if float_test "${upweb} == 0"; then
		slack "Warning: Service ${OPENSHIFT_DB_TOREPAIR} is down!" 1>&2;
		if float_test "${OPENSHIFT_MONIT_REPAIR} > 0"; then
			slack "Restarting ${OPENSHIFT_DB_TORTOREPAIRR} automatically.";
			docker-compose -f /root/server/docker-compose.yml stop;
			docker-compose -f /root/server/docker-compose.yml start; 
		fi;
	fi;
}
checkMongoUp
checkQuota "${OPENSHIFT_MONIT_MONGOQUOTA}" "${OPENSHIFT_MONIT_MONGOMAXQUOTA}" "${OPENSHIFT_MONIT_INODEQUOTA}"
checkWebStatus
