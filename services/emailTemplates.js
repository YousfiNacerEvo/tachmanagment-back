function baseLayout({ title, body }) {
  return `
  <div style="font-family: Arial, sans-serif; line-height:1.6; color:#1f2937;">
    <h2 style="color:#111827;">${title}</h2>
    <div>${body}</div>
    <hr style="margin:16px 0; border:none; border-top:1px solid #e5e7eb;"/>
    <div style="font-size:12px; color:#6b7280;">This is an automated message. Please do not reply.</div>
  </div>`;
}

function linkHtml(href, label) {
  return `<a href="${href}" style="color:#2563eb; text-decoration:underline;">${label}</a>`;
}

function adminCreationTemplate({ creatorName, itemType, itemName, href }) {
  const title = `${itemType} created`;
  const body = `
    <p><strong>${creatorName}</strong> created a new ${itemType.toLowerCase()}: <strong>${itemName}</strong>.</p>
    <p>${linkHtml(href, `Open ${itemType}`)}</p>
  `;
  return { subject: `[New ${itemType}] ${itemName}`, html: baseLayout({ title, body }) };
}

function reminderTemplate({ creatorEmail, itemType, itemName, href, days }) {
  const title = `${itemType} deadline reminder`;
  const intro = days === 0
    ? `Today is the deadline for the ${itemType.toLowerCase()} <strong>${itemName}</strong>.`
    : `In ${days} day${days > 1 ? 's' : ''}, the ${itemType.toLowerCase()} <strong>${itemName}</strong> reaches its deadline.`;
  const body = `
    <p>${intro}</p>
    <p>Creator: <strong>${creatorEmail}</strong></p>
    <p>${linkHtml(href, `Open ${itemType}`)}</p>
  `;
  return { subject: `[${itemType} Reminder] ${itemName}`, html: baseLayout({ title, body }) };
}

function assignmentTemplate({ creatorName, itemType, itemName, href }) {
  const title = `Assigned to a ${itemType.toLowerCase()}`;
  const body = `
    <p>You have been assigned to the ${itemType.toLowerCase()} <strong>${itemName}</strong>.</p>
    <p>Creator: <strong>${creatorName}</strong></p>
    <p>${linkHtml(href, `Open ${itemType}`)}</p>
  `;
  return { subject: `[Assigned] ${itemType}: ${itemName}`, html: baseLayout({ title, body }) };
}

function welcomeTemplate({ userEmail, userRole, loginUrl }) {
  const title = `Welcome to TachManager!`;
  const roleDescription = {
    admin: 'You have full access to all features including user management, project creation, and system administration.',
    member: 'You can view and work on assigned projects and tasks.',
    guest: 'You have limited access to view assigned projects and tasks.'
  };
  
  const body = `
    <p>Hello and welcome to <strong>TachManager</strong>!</p>
    <p>Your account has been successfully created with the following details:</p>
    <ul style="margin: 16px 0; padding-left: 20px;">
      <li><strong>Email:</strong> ${userEmail}</li>
      <li><strong>Role:</strong> ${userRole}</li>
    </ul>
    <p>${roleDescription[userRole] || roleDescription.member}</p>
    <p>You can now log in to your account and start using the platform.</p>
    <p style="margin: 24px 0;">
      <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Access Your Account
      </a>
    </p>
    <p>If you have any questions or need assistance, please don't hesitate to contact your administrator.</p>
    <p>Best regards,<br>The TachManager Team</p>
  `;
  return { 
    subject: `Welcome to TachManager - Your Account is Ready!`, 
    html: baseLayout({ title, body }) 
  };
}

module.exports = {
  adminCreationTemplate,
  reminderTemplate,
  assignmentTemplate,
  welcomeTemplate,
};


