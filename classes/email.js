const postmark = require('postmark')

class PostmarkMailer {
  
  constructor() {
    this.client = new postmark.ServerClient(process.env.POSTMARK_API_KEY)
  }

  send = async (params) => {

    try {
      const fromAddress = typeof params.from === 'object' 
        ? `${params.from.name} <${params.from.email}>`
        : params.from;

      await this.client.sendEmail({
        To: params.to,
        From: fromAddress,
        Subject: params.subject,
        TextBody: params.text,
        HtmlBody: params.html,
      });
    } catch (error) {
      console.error(error);
      if (error.response) {
        console.error(error.response.body)
      }
    }
  }

}

module.exports = new PostmarkMailer()