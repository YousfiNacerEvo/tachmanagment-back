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

module.exports = {
  adminCreationTemplate,
  reminderTemplate,
  assignmentTemplate,
};


