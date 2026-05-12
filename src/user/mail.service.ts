import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  sendEmail(to: string, subject: string, body: string) {
    // Simulate sending an email
    console.log(
      `Sending email to ${to} with subject "${subject}" and body "${body}"`,
    );
    return { success: true, message: 'Email sent successfully' };
  }
}
