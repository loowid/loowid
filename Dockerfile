#
# Build Loowid Image
#
FROM       node:0.10.33

MAINTAINER loowid <loowid@gmail.com>

# Download and install loowid source
RUN mkdir /opt/loowid
# Just copy the package file in so that builds are well cached and it doesn't rebuild everything
COPY package.json /opt/loowid/
RUN cd /opt/loowid && npm install --production

COPY . /opt/loowid

# Create self signed certificate
RUN openssl genrsa -out /opt/loowid/private.pem 1024 && \
    openssl req -new -key /opt/loowid/private.pem -out /opt/loowid/public.csr -subj "/C=ES/ST=None/L=None/O=None/OU=None/CN=localhost" && \
    openssl x509 -req -days 366 -in /opt/loowid/public.csr -signkey /opt/loowid/private.pem -out /opt/loowid/public.pem

# Expose https port from the container to the host
EXPOSE 443

# Work directory
WORKDIR /opt/loowid

# Run server
CMD npm start
