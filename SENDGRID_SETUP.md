# Configuration SendGrid - TachManager

## Migration de SMTP vers SendGrid

L'application a été migrée de Nodemailer/SMTP vers SendGrid pour résoudre les problèmes de ports SMTP bloqués sur Render.

## Configuration requise

### 1. Variables d'environnement

Créez un fichier `.env` dans le dossier `backend/` avec la configuration suivante :

```env
# Configuration SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=your_verified_sender_email@yourdomain.com

# URL du frontend pour les liens de connexion
FRONTEND_URL=http://localhost:3000
```

### 2. Configuration SendGrid

1. **Créez un compte SendGrid** : https://sendgrid.com/
2. **Générez une API Key** :
   - Allez dans Settings > API Keys
   - Créez une nouvelle API Key avec les permissions "Mail Send"
   - Copiez la clé et ajoutez-la à `SENDGRID_API_KEY`
3. **Vérifiez votre expéditeur** :
   - Allez dans Settings > Sender Authentication
   - Vérifiez un seul expéditeur ou un domaine
   - Utilisez cette adresse email dans `SENDGRID_FROM_EMAIL`

### 3. Déploiement sur Render

Ajoutez les variables d'environnement dans votre dashboard Render :

```
SENDGRID_API_KEY=your_actual_api_key
SENDGRID_FROM_EMAIL=your_verified_email@yourdomain.com
FRONTEND_URL=https://your-frontend-url.com
```

## Fonctionnalités supportées

- ✅ Emails de bienvenue pour nouveaux utilisateurs
- ✅ Rappels de tâches en retard
- ✅ Rappels de projets en retard
- ✅ Notifications d'assignation
- ✅ Support des destinataires multiples
- ✅ Templates HTML personnalisés

## Test de la configuration

Pour tester la configuration, vous pouvez créer un script de test :

```javascript
// test-sendgrid.js
require('dotenv').config();
const { sendEmail } = require('./services/emailService');

async function testEmail() {
  try {
    await sendEmail({
      to: 'test@example.com',
      subject: 'Test SendGrid',
      html: '<h1>Test réussi!</h1>',
      text: 'Test réussi!'
    });
    console.log('Email envoyé avec succès!');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

testEmail();
```

## Avantages de SendGrid

- ✅ Pas de problèmes de ports SMTP
- ✅ Meilleure délivrabilité
- ✅ Analytics et tracking
- ✅ Gestion des bounces et désabonnements
- ✅ Support des templates dynamiques
- ✅ API REST moderne

## Migration terminée

Le service `emailService.js` a été complètement migré vers SendGrid. Tous les appels existants continuent de fonctionner sans modification.
