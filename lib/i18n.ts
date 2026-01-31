export type Locale = 'fr' | 'en' | 'ar'

export const translations = {
  fr: {
    // Landing Page - Professional Financial French
    'landing.badge': 'Conforme IGOC 2024',
    'landing.hero.title': 'Change de Devises',
    'landing.hero.subtitle': 'Multi-Banques.',
    'landing.hero.description': 'Plateforme professionnelle reliant PME et Salles de Marchés',
    'landing.hero.description2': 'pour des opérations de change sur mesure et transparentes.',
    'landing.cta.register': 'Ouvrir un Compte',
    'landing.cta.login': 'Espace Client',
    'landing.feature1.title': 'Meilleurs Taux',
    'landing.feature1.desc': 'Enchères inversées en temps réel. Comparez les cotations de plusieurs banques et obtenez les meilleures conditions du marché.',
    'landing.feature2.title': 'Sécurité Bancaire',
    'landing.feature2.desc': 'KYC approfondi et validation SWIFT obligatoire. Conformité totale aux réglementations ACPR et TRACFIN.',
    'landing.feature3.title': 'Connexion Multi-Banques',
    'landing.feature3.desc': 'Accédez à un réseau de banques partenaires certifiées. Une seule plateforme pour tous vos besoins en devises.',
    
    // Navigation
    'nav.login': 'Se connecter',
    'nav.register': 'Commencer',
    'nav.dashboard': 'Dashboard',
    'nav.kyc': 'KYC',
    'nav.swift': 'SWIFT',
    'nav.auctions': 'Enchères',
    'nav.operations': 'Opérations',
    'nav.documents': 'Documents',
    'nav.logout': 'Déconnexion',
    
    // Common
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.submit': 'Soumettre',
    'common.validate': 'Valider',
    'common.reject': 'Refuser',
    'common.view': 'Voir',
    'common.download': 'Télécharger',
  },
  en: {
    // Landing Page - Professional Financial English
    'landing.badge': 'IGOC 2024 Compliant',
    'landing.hero.title': 'Multi-Bank',
    'landing.hero.subtitle': 'FX Platform.',
    'landing.hero.description': 'Professional platform connecting SMEs and Trading Desks',
    'landing.hero.description2': 'for tailored and transparent currency exchange operations.',
    'landing.cta.register': 'Open an Account',
    'landing.cta.login': 'Client Portal',
    'landing.feature1.title': 'Best Rates',
    'landing.feature1.desc': 'Real-time reverse auctions. Compare quotes from multiple banks and secure the best market conditions.',
    'landing.feature2.title': 'Banking Security',
    'landing.feature2.desc': 'Enhanced KYC and mandatory SWIFT validation. Full compliance with ACPR and TRACFIN regulations.',
    'landing.feature3.title': 'Multi-Bank Access',
    'landing.feature3.desc': 'Connect to a network of certified partner banks. One platform for all your FX needs.',
    
    // Navigation
    'nav.login': 'Login',
    'nav.register': 'Get Started',
    'nav.dashboard': 'Dashboard',
    'nav.kyc': 'KYC',
    'nav.swift': 'SWIFT',
    'nav.auctions': 'Auctions',
    'nav.operations': 'Operations',
    'nav.documents': 'Documents',
    'nav.logout': 'Logout',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.validate': 'Validate',
    'common.reject': 'Reject',
    'common.view': 'View',
    'common.download': 'Download',
  },
  ar: {
    // Landing Page - Professional Financial Arabic
    'landing.badge': 'متوافق مع IGOC 2024',
    'landing.hero.title': 'صرف العملات الأجنبية',
    'landing.hero.subtitle': 'متعدد البنوك.',
    'landing.hero.description': 'منصة احترافية تربط الشركات الصغيرة والمتوسطة بغرف التداول',
    'landing.hero.description2': 'لعمليات صرف عملات مخصصة وشفافة.',
    'landing.cta.register': 'فتح حساب',
    'landing.cta.login': 'بوابة العملاء',
    'landing.feature1.title': 'أفضل الأسعار التنافسية',
    'landing.feature1.desc': 'مناقصات عكسية فورية. قارن عروض الأسعار من بنوك متعددة واحصل على أفضل شروط السوق.',
    'landing.feature2.title': 'الأمان المصرفي والامتثال',
    'landing.feature2.desc': 'تحقق اعرف عميلك (KYC) شامل والتحقق الإلزامي من SWIFT. امتثال كامل للوائح ACPR و TRACFIN.',
    'landing.feature3.title': 'وصول متعدد للبنوك',
    'landing.feature3.desc': 'اتصل بشبكة من البنوك الشريكة المعتمدة. منصة واحدة لجميع احتياجاتك من العملات الأجنبية.',
    
    // Navigation
    'nav.login': 'تسجيل الدخول',
    'nav.register': 'ابدأ الآن',
    'nav.dashboard': 'لوحة القيادة',
    'nav.kyc': 'ملف اعرف عميلك',
    'nav.swift': 'إثبات الأموال (SWIFT)',
    'nav.auctions': 'المناقصات',
    'nav.operations': 'العمليات',
    'nav.documents': 'المستندات القانونية',
    'nav.logout': 'تسجيل الخروج',
    
    // Common
    'common.loading': 'جار التحميل...',
    'common.save': 'حفظ التغييرات',
    'common.cancel': 'إلغاء',
    'common.submit': 'إرسال الطلب',
    'common.validate': 'تأكيد وصلاحية',
    'common.reject': 'رفض',
    'common.view': 'معاينة',
    'common.download': 'تنزيل',
  },
}

export function getTranslation(locale: Locale, key: string): string {
  return translations[locale][key as keyof typeof translations['fr']] || key
}
