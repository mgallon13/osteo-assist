-- =============================================================================
-- Données de référence : checklist drapeaux rouges (globale)
-- clinically_reviewed = false : CONTENU À FAIRE VALIDER PAR UN RÉFÉRENT CLINIQUE
-- avant toute mise en production. Il s'agit d'aide-mémoire génériques,
-- identiques pour tous les patients ; l'outil ne détecte ni ne conclut rien.
-- =============================================================================
insert into public.red_flag_items (organization_id, category, label, description, source, clinically_reviewed, sort_order) values
  (null, 'Général', 'Fièvre ou altération de l''état général inexpliquée', null, 'À valider', false, 10),
  (null, 'Général', 'Perte de poids inexpliquée', null, 'À valider', false, 20),
  (null, 'Général', 'Antécédent de cancer', null, 'À valider', false, 30),
  (null, 'Général', 'Douleur non mécanique, nocturne, non soulagée par le repos', null, 'À valider', false, 40),
  (null, 'Général', 'Traumatisme récent significatif', null, 'À valider', false, 50),
  (null, 'Général', 'Immunodépression ou corticothérapie prolongée', null, 'À valider', false, 60),
  (null, 'Rachis lombaire', 'Troubles sphinctériens (urinaires, anaux) d''apparition récente', null, 'À valider', false, 10),
  (null, 'Rachis lombaire', 'Anesthésie en selle', null, 'À valider', false, 20),
  (null, 'Rachis lombaire', 'Déficit neurologique progressif ou étendu', null, 'À valider', false, 30),
  (null, 'Rachis cervical', 'Signes évocateurs d''atteinte vasculaire (vertiges, diplopie, dysarthrie, dysphagie, chutes brutales)', null, 'À valider', false, 10),
  (null, 'Rachis cervical', 'Signes évocateurs de myélopathie (troubles de la marche, maladresse des mains)', null, 'À valider', false, 20),
  (null, 'Céphalées', 'Céphalée brutale et intense inhabituelle', null, 'À valider', false, 10);
