# Usage prévu (intended purpose) — brouillon v0.1

> Document de travail. **À faire relire par un consultant en réglementation des dispositifs médicaux avant toute mise sur le marché.** La qualification d'un logiciel au regard du règlement (UE) 2017/745 dépend uniquement de son usage prévu (guide MDCG 2019-11 rev.1). Chaque fonctionnalité doit rester dans ce périmètre ; toute extension doit être réévaluée **avant** d'être développée.

## Énoncé

OstéoAssist est un outil d'aide à la **documentation** destiné aux ostéopathes. Il permet de tenir des dossiers patients, de rédiger des comptes rendus de séance dans la structure et le vocabulaire propres au praticien, et de consulter une bibliothèque documentaire scientifique par thème.

OstéoAssist **ne fournit aucune information destinée à orienter une décision diagnostique ou thérapeutique pour un patient donné.** Toute décision clinique relève exclusivement du praticien.

## Dans le périmètre

| Fonction | Garde-fou |
|---|---|
| Dossier patient, historique des séances | Données saisies par le praticien |
| Compte rendu structuré, rédigé dans le style du praticien | Brouillon modifiable ; validation explicite obligatoire ; origine de chaque section affichée ; aucune invention d'observation ou de technique |
| Interview « Ma méthode » | Sert uniquement à la rédaction (structure, vocabulaire, niveau de détail). Jamais utilisée pour proposer un test ou une technique |
| Checklist drapeaux rouges | Liste de référence **identique pour tous les patients**, cochée par le praticien. L'outil ne détecte, ne déduit et ne conclut rien |
| Bibliothèque scientifique | Recherche documentaire par thème, avec sources. Jamais appliquée automatiquement au patient en cours |

## Hors périmètre (ne pas développer sans réévaluation réglementaire)

- Suggestion de techniques, de tests ou de conduite à tenir pour un patient donné
- Conduite à tenir en cas d'échec d'un traitement, personnalisée au patient
- Détection automatique de drapeaux rouges à partir des notes ou de la transcription
- Score de risque, triage, orientation automatique

Ces fonctions relèveraient très probablement de la classe IIa ou plus (règle 11), avec organisme notifié, ISO 13485, évaluation clinique et marquage CE.

## Données de santé

Tant que l'hébergement n'est pas assuré par un hébergeur certifié HDS (base, stockage, sauvegardes **et** modèles d'IA qui traitent des données de patients) : **données fictives uniquement**. Ce garde-fou est appliqué dans l'interface (case « patient fictif » obligatoire, bandeau permanent).
