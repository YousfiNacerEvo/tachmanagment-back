# Configuration Email - TachManager

## Problème actuel
L'email de bienvenue n'est pas envoyé car le service SMTP n'est pas configuré.

## Solution

### 1. Créer un fichier .env dans le dossier backend

Créez un fichier `.env` dans le dossier `backend/` avec la configuration suivante :

```env
# Configuration SMTP pour Gmail (recommandé pour les tests)
SMTP_SERVICE=gmail
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-application

# Configuration de l'expéditeur
EMAIL_FROM=votre-email@gmail.com

# URL du frontend pour les liens de connexion
FRONTEND_URL=http://localhost:3000
```

### 2. Configuration Gmail (Recommandée)

1. **Activez l'authentification à 2 facteurs** sur votre compte Gmail
2. **Générez un mot de passe d'application** :
   - Allez dans Paramètres Google > Sécurité
   - Activez l'authentification à 2 facteurs
   - Générez un "Mot de passe d'application" pour "Mail"
   - Utilisez ce mot de passe dans `SMTP_PASS`

### 3. Configuration SMTP personnalisée

Si vous préférez utiliser un autre fournisseur :

```env
SMTP_HOST=smtp.votre-fournisseur.com
SMTP_PORT=587
SMTP_USER=votre-email@votre-domaine.com
SMTP_PASS=votre-mot-de-passe
EMAIL_FROM=votre-email@votre-domaine.com
FRONTEND_URL=http://localhost:3000
```

### 4. Test de la configuration

Après avoir configuré le fichier `.env`, redémarrez le serveur backend et testez :

```bash
cd backend
node test-welcome-email.js
```

### 5. Vérification des logs

Lors de la création d'un utilisateur, vous devriez voir dans les logs :
- `[AddUser] Welcome email sent successfully to: email@example.com`

Si vous voyez `[emailService] SMTP not configured`, cela signifie que le fichier `.env` n'est pas correctement configuré.

## Note importante

L'envoi d'email est configuré pour ne pas faire échouer la création d'utilisateur. Même si l'email échoue, l'utilisateur sera créé avec succès.
