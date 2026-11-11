export const sendEmail = async ({ to, subject, html }) => {
    console.log(`[Email System] Sending mail to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${html}\n----------------------------------`);
    return { success: true };
};
