// Legal document templates for Direct Devise

export interface CompanyData {
  company: string
  registrationNumber?: string
  address?: string
  representative?: string
  representativeTitle?: string
  city?: string
}

export const documentTemplates = {
  saasContract: (client: CompanyData) => `
CONTRAT DE PRESTATION DE SERVICES SAAS

Entre les soussignés :

Direct Devise SARL
• Société immatriculée au Registre du Commerce de Casablanca, n° RC-CASA-2024-001
• Siège social : Casablanca Finance City, Tour CFC, Maroc
• Représentée par M. Ahmed Benali, en qualité de Directeur Général

Ci-après dénommée « le Prestataire »,

Et

${client.company}
• Société immatriculée au Registre du Commerce de ${client.city || '[Ville]'}, n° ${client.registrationNumber || '[Numéro]'}
• Siège social : ${client.address || '[Adresse]'}
• Représentée par ${client.representative || '[Nom]'}, en qualité de ${client.representativeTitle || '[Titre]'}

Ci-après dénommée « le Client »,

Article 1 : Objet
Le présent contrat a pour objet la fourniture par le Prestataire d'un accès à la plateforme SaaS Direct Devise permettant la gestion du risque de change et l'exécution des opérations de change conformément aux réglementations de l'office de change.

Article 2 : Durée
Le contrat prend effet à compter de sa signature pour une durée initiale de 12 mois, renouvelable tacitement.

Article 3 : Obligations des parties
• Le Prestataire s'engage à fournir les services avec diligence et conformité aux normes applicables.
• Le Client s'engage à fournir tous les documents requis par l'office de change et à respecter les procédures définies.

Article 4 : Prix et modalités de paiement
• Le Client s'acquitte d'un abonnement mensuel et de commissions selon les taux définis au barème joint.
• Les paiements sont effectués par virement bancaire à réception de facture.

Article 5 : Confidentialité et protection des données
Chacune des parties s'engage à préserver la confidentialité des informations échangées, conformément au RGPD et à la loi marocaine n° 09-08.

Article 6 : Loi applicable et juridiction
Le présent contrat est soumis au droit marocain. Tout litige sera porté devant les tribunaux compétents de Casablanca.

Fait à Casablanca, le ${new Date().toLocaleDateString('fr-FR')}

Signatures :
Le Prestataire : __________
Le Client : __________
`,

  eligibilityDeclaration: (client: CompanyData) => `
DÉCLARATION D'ÉLIGIBILITÉ AUX OPÉRATIONS DE CHANGE

Je soussigné(e), ${client.representative || '[Nom, Prénom]'}, représentant légal de la société ${client.company}, atteste sur l'honneur que :

1. Ma société est une PME marocaine immatriculée au Registre du Commerce sous le n° ${client.registrationNumber || '[Numéro]'}.

2. Les documents suivants ont été fournis à Direct Devise pour vérification conformément à l'IGOC 2024 :
   • Extrait du Registre de Commerce
   • Statuts de la société
   • Liste des bénéficiaires effectifs (UBO)
   • Pièces d'identité des dirigeants
   • Justificatif d'adresse
   • RIB/SWIFT

3. La société respecte les conditions restrictives de l'IGOC 2024 Article 3.2 et la réglementation AML applicable (Circulaire OC n°12/2023).

4. Les opérations de change réalisées via Direct Devise sont strictement réservées aux activités de rapatriement autorisées.

5. Je m'engage à informer Direct Devise de tout changement dans la situation de ma société susceptible d'affecter son éligibilité.

Fait à ${client.city || '[Ville]'}, le ${new Date().toLocaleDateString('fr-FR')}

Signature et cachet de la société :

_________________________
${client.representative || '[Nom]'}
${client.representativeTitle || '[Titre]'}
`,

  changeMandate: (client: CompanyData) => `
MANDAT D'AUTORISATION DE CHANGE

Je soussigné(e) ${client.representative || '[Nom, Prénom]'}, agissant au nom et pour le compte de la société ${client.company}, immatriculée sous le n° ${client.registrationNumber || '[Numéro]'}, autorise la société Direct Devise SARL à :

1. Effectuer en mon nom les opérations de change nécessaires aux rapatriements de fonds dans le cadre de l'activité commerciale de ma société.

2. Gérer les flux financiers liés à ces opérations, en strict respect des taux réglementés et des procédures définies par l'IGOC 2024.

3. Accéder aux informations bancaires et documents nécessaires au bon traitement de ces opérations dans le respect de la confidentialité.

4. Transmettre à l'Office de Change marocain les rapports réglementaires obligatoires relatifs à mes opérations de change.

5. Conserver les documents relatifs aux opérations de change conformément aux exigences réglementaires (durée légale de 10 ans).

Cette autorisation est valable pour la durée du contrat de services SaaS en cours entre les parties, soit une durée initiale de 12 mois renouvelable.

Je certifie avoir pris connaissance des conditions générales d'utilisation de la plateforme Direct Devise et m'engage à respecter l'ensemble des réglementations en vigueur.

Fait à ${client.city || '[Ville]'}, le ${new Date().toLocaleDateString('fr-FR')}

Signature et cachet de la société :

_________________________
${client.representative || '[Nom]'}
${client.representativeTitle || '[Titre]'}
${client.company}
`,

  confidentialityAgreement: (client: CompanyData) => `
ACCORD DE CONFIDENTIALITÉ ET PROTECTION DES DONNÉES

Entre :
Direct Devise SARL, ci-après « le Prestataire »
Et
${client.company}, ci-après « le Client »

Les parties s'engagent à respecter la confidentialité de toutes les données échangées dans le cadre du présent contrat.

Article 1 : Données concernées
Sont considérées comme confidentielles toutes les informations relatives à :
• Les opérations de change et transactions financières
• Les documents SWIFT et bancaires
• Les informations commerciales et stratégiques
• Les données personnelles des représentants et employés

Article 2 : Protection des données personnelles
Le traitement des données personnelles est effectué conformément aux dispositions :
• Du Règlement Général sur la Protection des Données (RGPD)
• De la loi marocaine n° 09-08 relative à la protection des personnes physiques
• Des directives de Bank Al-Maghrib

Article 3 : Durée de conservation
Les données sont conservées pour la durée nécessaire aux fins pour lesquelles elles sont traitées, et conformément aux obligations légales (minimum 10 ans pour les opérations de change).

Article 4 : Droits des personnes
Le Client dispose d'un droit d'accès, de rectification et de suppression de ses données en contactant Direct Devise.

Article 5 : Sanctions
Toute divulgation non autorisée des données sera sanctionnée conformément à la loi marocaine et pourra entraîner la résiliation immédiate du contrat.

Fait à Casablanca, le ${new Date().toLocaleDateString('fr-FR')}

Signatures des parties :
Le Prestataire : __________
Le Client : __________
`
}

export type DocumentType = 'saasContract' | 'eligibilityDeclaration' | 'changeMandate' | 'confidentialityAgreement'

export const documentTitles: Record<DocumentType, string> = {
  saasContract: 'Contrat de Prestation de Services SaaS',
  eligibilityDeclaration: 'Déclaration d\'Éligibilité aux Opérations de Change',
  changeMandate: 'Mandat d\'Autorisation de Change',
  confidentialityAgreement: 'Accord de Confidentialité et Protection des Données'
}

export const documentDescriptions: Record<DocumentType, string> = {
  saasContract: 'Contrat principal régissant la relation entre Direct Devise et votre société',
  eligibilityDeclaration: 'Attestation sur l\'honneur de conformité aux exigences IGOC 2024',
  changeMandate: 'Autorisation pour Direct Devise d\'effectuer les opérations de change',
  confidentialityAgreement: 'Engagement de confidentialité et protection des données (RGPD)'
}
