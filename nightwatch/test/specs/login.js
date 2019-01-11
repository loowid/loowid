'use strict'

module.exports = {
  'Loowid Main Page': function (browser) {
    browser
      .url(browser.launch_url)
      .assert.title('Loowid - Look what I\'m doing!')
      .pause(5000);
  },
  'Loowid Terms Empty': function (browser) {
    browser
      .clearValue('input[id="mname"]')
      .setValue('input[id="mname"]','NightWatch')
      .click('button[id="main_button"]')
      .assert.visible('p.alert');
  },
  'Loowid Terms Check': function(browser) {
    browser
      .click('input[id="terms"]')
      .click('button[id="main_button"]')
      .waitForElementNotVisible('#noscript',5000)
      .assert.elementPresent('div.owner h3[title="NightWatch"]');
  },
  'Loowid Join Room': function(browser) {
    browser
      .click('a.loowidurl')
      .pause(5000)
      .waitForElementVisible('ul.connected',5000)
      .assert.elementPresent('ul.connected h3[title="NightWatch"]')
      .pause(5000)
      .end();
  }
}
