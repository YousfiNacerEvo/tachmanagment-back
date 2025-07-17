const { supabase } = require('../services/supabaseClient');

// POST /api/users
async function createUser(req, res) {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      console.log('[AddUser] Champs manquants', req.body);
      return res.status(400).json({ message: 'Champs manquants' });
    }
    // Créer l'utilisateur dans Supabase Auth (admin)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
    });
    if (error || !data || !data.user) {
      console.log('[AddUser] Supabase error:', error);
      const msg = error?.message || 'Erreur lors de la création Supabase';
      return res.status(400).json({ message: msg });
    }
    const userId = data.user.id;
    // Vérifier si déjà présent dans la table users
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    if (selectError) {
      console.log('[AddUser] Erreur select users:', selectError);
    }
    if (existingUser) {
      console.log('[AddUser] Utilisateur déjà présent dans la table users:', userId);
      return res.status(400).json({ message: 'Utilisateur déjà présent dans la base.' });
    }
    // Insérer dans la table public.users
    const { error: dbError } = await supabase
      .from('users')
      .insert([{ id: userId, email, role }]);
    if (dbError) {
      console.log('[AddUser] Erreur insertion users:', dbError);
      return res.status(400).json({ message: dbError.message });
    }
    console.log('[AddUser] Utilisateur créé avec succès:', userId);
    return res.status(201).json({ message: 'Utilisateur créé', id: userId });
  } catch (err) {
    console.log('[AddUser] Exception:', err);
    return res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
}

module.exports = { createUser }; 