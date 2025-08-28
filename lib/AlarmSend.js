const { WebClient } = require('@slack/web-api')
const token = process.env.SLACK_TOKEN
const web = new WebClient(token)
const conversationId = 'C087PKV3D62'// production
// const conversationId = 'C088GS4GVBL' // test

class AlarmSend {
    async chatSendMessage(textMessage) {
        const res = await web.chat.postMessage({
            channel: conversationId,
            text: 'fallback text message',
            blocks: textMessage
        })
        console.log('Message sent: ', res.ts)
    }
}
module.exports = new AlarmSend()
