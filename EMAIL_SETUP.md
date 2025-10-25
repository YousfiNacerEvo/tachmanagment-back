# Configuration Email - TachManager

## ⚠️ MIGRATION TERMINÉE : SMTP → SendGrid

**L'application a été migrée de Nodemailer/SMTP vers SendGrid** pour résoudre les problèmes de ports SMTP bloqués sur Render.

## Configuration SendGrid

### 1. Créer un fichier .env dans le dossier backend

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

### 3. Test de la configuration

Après avoir configuré le fichier `.env`, testez la configuration :

```bash
cd backend
node test-sendgrid.js
```

Pour tester tous les types d'emails :

```bash
node test-all-emails.js
```

### 4. Vérification des logs

Lors de la création d'un utilisateur, vous devriez voir dans les logs :
- `[emailService] SendGrid initialized successfully`
- `[AddUser] Welcome email sent successfully to: email@example.com`

Si vous voyez `[emailService] SendGrid not configured`, cela signifie que le fichier `.env` n'est pas correctement configuré.

## Avantages de SendGrid

- ✅ Pas de problèmes de ports SMTP
- ✅ Meilleure délivrabilité
- ✅ Analytics et tracking
- ✅ Gestion des bounces et désabonnements
- ✅ Support des templates dynamiques
- ✅ API REST moderne

## Note importante

L'envoi d'email est configuré pour ne pas faire échouer la création d'utilisateur. Même si l'email échoue, l'utilisateur sera créé avec succès.

## Documentation complète

Voir `SENDGRID_SETUP.md` pour la documentation complète de la migration.
