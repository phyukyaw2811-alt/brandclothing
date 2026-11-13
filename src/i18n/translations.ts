import type { Language } from '../types/garment';

export interface TranslationStrings {
  navViewer: string;
  navLookbook: string;
  navSpecSheet: string;
  addGarment: string;
  tabDetails: string;
  tabImages: string;
  tabFabric: string;
  garmentName: string;
  brandLabel: string;
  collectionDrop: string;
  designerCredit: string;
  skuCode: string;
  price: string;
  currency: string;
  fabricComp: string;
  fabricGsm: string;
  fitCut: string;
  printTechnique: string;
  availableSizes: string;
  careInstructions: string;
  garmentNotes: string;
  garmentNotesPlaceholder: string;
  frontViewImage: string;
  backViewImage: string;
  uploadFront: string;
  uploadBack: string;
  splitSheetBtn: string;
  splitSheetHint: string;
  mappingMode: string;
  modeFullPhoto: string;
  modeGraphicDecal: string;
  autoRemoveBg: string;
  bgTolerance: string;
  scale: string;
  offsetX: string;
  offsetY: string;
  resetCalibration: string;
  silhouette: string;
  silOversized: string;
  silClassic: string;
  silLongSleeve: string;
  silHoodie: string;
  fabricFinish: string;
  baseFabricColor: string;
  autoSpin: string;
  spinSpeed: string;
  hideControls: string;
  showControls: string;
  snapshot: string;
  viewFront: string;
  viewSide: string;
  viewBack: string;
  viewHero: string;
  backdrop: string;
  savedWardrobe: string;
  duplicateGarment: string;
  deleteGarment: string;
  openSpecSheet: string;
  printTechPack: string;
  dragHint: string;
  modalTitle: string;
  modalSubtitle: string;
  createAndView: string;
  cancel: string;
  singleSheetUpload: string;
  separateUpload: string;
  splitPosition: string;
}

export const TRANSLATIONS: Record<Language, TranslationStrings> = {
  en: {
    navViewer: '3D Studio',
    navLookbook: 'Lookbook',
    navSpecSheet: 'Spec Sheet',
    addGarment: 'Add Garment',
    tabDetails: 'Details',
    tabImages: 'Front & Back',
    tabFabric: 'Fit & Fabric',
    garmentName: 'Garment Title',
    brandLabel: 'Brand / Label',
    collectionDrop: 'Collection / Drop',
    designerCredit: 'Designer / Credit',
    skuCode: 'SKU / Style ID',
    price: 'Price',
    currency: 'Currency',
    fabricComp: 'Fabric Composition',
    fabricGsm: 'Fabric Weight (GSM)',
    fitCut: 'Fit & Cut',
    printTechnique: 'Print / Embellishment',
    availableSizes: 'Available Sizes',
    careInstructions: 'Care & Wash Notes',
    garmentNotes: 'Garment Details & Story',
    garmentNotesPlaceholder:
      'Write garment story, stitching notes, graphic meaning, or customer sizing advice...',
    frontViewImage: 'Front Shirt Image',
    backViewImage: 'Back Shirt Image',
    uploadFront: 'Upload Front PNG / JPG',
    uploadBack: 'Upload Back PNG / JPG',
    splitSheetBtn: 'Split 1 Combined Sheet (Front + Back)',
    splitSheetHint:
      'Have a single side-by-side image? Upload it once and split left/right automatically.',
    mappingMode: 'Texture Mapping Mode',
    modeFullPhoto: 'Full Garment Photo',
    modeGraphicDecal: 'Graphic Print on Solid',
    autoRemoveBg: 'Remove Studio Backdrop',
    bgTolerance: 'Backdrop Edge Tolerance',
    scale: 'Zoom / Scale',
    offsetX: 'Horizontal Shift',
    offsetY: 'Vertical Shift',
    resetCalibration: 'Reset Framing',
    silhouette: '3D Silhouette',
    silOversized: 'Oversized Tee',
    silClassic: 'Classic Tee',
    silLongSleeve: 'Long Sleeve',
    silHoodie: 'Boxy Hoodie',
    fabricFinish: 'Weave & Surface Finish',
    baseFabricColor: 'Base Fabric Color',
    autoSpin: '360° Spin',
    spinSpeed: 'Spin Speed',
    hideControls: 'Hide Controls',
    showControls: 'Show Controls',
    snapshot: 'Snapshot',
    viewFront: 'Front',
    viewSide: 'Side',
    viewBack: 'Back',
    viewHero: '3/4 View',
    backdrop: 'Backdrop',
    savedWardrobe: 'Saved Garments',
    duplicateGarment: 'Duplicate',
    deleteGarment: 'Delete',
    openSpecSheet: 'Open Spec Sheet',
    printTechPack: 'Print / Save PDF',
    dragHint: 'Drag to orbit 360° · Scroll to zoom',
    modalTitle: 'Add Custom Garment',
    modalSubtitle:
      'Upload separate front & back images or split a single side-by-side layout.',
    createAndView: 'Launch in 360° Viewer',
    cancel: 'Cancel',
    singleSheetUpload: 'Combined Front + Back Sheet',
    separateUpload: 'Separate Front & Back',
    splitPosition: 'Center Split Line',
  },
  mm: {
    navViewer: '၃၆၀° စတူဒီယို',
    navLookbook: 'အင်္ကျီစုစည်းမှု',
    navSpecSheet: 'အသေးစိတ်မှတ်တမ်း',
    addGarment: 'အင်္ကျီအသစ်ထည့်ရန်',
    tabDetails: 'အချက်အလက်',
    tabImages: 'ရှေ့ / နောက်ပုံ',
    tabFabric: 'အထည်နှင့်ပုံစံ',
    garmentName: 'အင်္ကျီအမည်',
    brandLabel: 'ဘရန်း / တံဆိပ်',
    collectionDrop: 'ကော်လက်ရှင် / Drop',
    designerCredit: 'ဒီဇိုင်နာ',
    skuCode: 'SKU / ကုဒ်နံပါတ်',
    price: 'ဈေးနှုန်း',
    currency: 'ငွေကြေး',
    fabricComp: 'အထည်သားဖွဲ့စည်းပုံ',
    fabricGsm: 'အထည်အလေးချိန် (GSM)',
    fitCut: 'ချုပ်လုပ်မှုပုံစံ (Fit)',
    printTechnique: 'ပုံနှိပ်နည်းပညာ',
    availableSizes: 'ရရှိနိုင်သော ဆိုဒ်များ',
    careInstructions: 'လျှော်ဖွပ်ထိန်းသိမ်းမှု',
    garmentNotes: 'အင်္ကျီအကြောင်း အသေးစိတ်ရေးရန်',
    garmentNotesPlaceholder:
      'အင်္ကျီဒီဇိုင်းအကြောင်း၊ ချုပ်သားအသေးစိတ်၊ ဆိုဒ်အကြံပြုချက်များ ရေးသားနိုင်ပါသည်...',
    frontViewImage: 'အင်္ကျီ အရှေ့ပုံ',
    backViewImage: 'အင်္ကျီ အနောက်ပုံ',
    uploadFront: 'အရှေ့ပုံ ထည့်ရန် (PNG / JPG)',
    uploadBack: 'အနောက်ပုံ ထည့်ရန် (PNG / JPG)',
    splitSheetBtn: 'ရှေ့/နောက် တွဲပါပုံ (၁) ပုံတည်းမှ ခွဲထုတ်ရန်',
    splitSheetHint:
      'ရှေ့နှင့်နောက် ဘေးချင်းကပ်ပါသော ပုံတစ်ပုံတည်းရှိပါက အလိုအလျောက် ခွဲထုတ်နိုင်ပါသည်။',
    mappingMode: 'ပုံကပ်သည့်စနစ်',
    modeFullPhoto: 'အင်္ကျီပုံအပြည့် (Photo)',
    modeGraphicDecal: 'ဂရပ်ဖစ်ဒီဇိုင်း (Decal)',
    autoRemoveBg: 'နောက်ခံအရောင် အလိုအလျောက်ဖယ်ရန်',
    bgTolerance: 'နောက်ခံဖယ်ရှားမှု အတိုင်းအတာ',
    scale: 'ပုံအရွယ်အစား',
    offsetX: 'ဘယ် / ညာ ရွှေ့ရန်',
    offsetY: 'အပေါ် / အောက် ရွှေ့ရန်',
    resetCalibration: 'မူလအတိုင်းပြန်ထားရန်',
    silhouette: '၃D အင်္ကျီပုံစံ',
    silOversized: 'Oversized တီရှပ်',
    silClassic: 'Classic တီရှပ်',
    silLongSleeve: 'လက်ရှည်',
    silHoodie: 'Hoodie',
    fabricFinish: 'အထည်သားအမျိုးအစား',
    baseFabricColor: 'အင်္ကျီအခြေခံအရောင်',
    autoSpin: 'တစ်ပတ်လည်ပြသမှု',
    spinSpeed: 'လည်ပတ်နှုန်း',
    hideControls: 'ခလုတ်များဝှက်ရန်',
    showControls: 'ခလုတ်များပြရန်',
    snapshot: 'ပုံသိမ်းရန်',
    viewFront: 'အရှေ့',
    viewSide: 'ဘေး',
    viewBack: 'အနောက်',
    viewHero: '၃/၄ မြင်ကွင်း',
    backdrop: 'နောက်ခံ',
    savedWardrobe: 'သိမ်းထားသော အင်္ကျီများ',
    duplicateGarment: 'မိတ္တူပွားရန်',
    deleteGarment: 'ဖျက်ရန်',
    openSpecSheet: 'Spec Sheet ကြည့်ရန်',
    printTechPack: 'Print / PDF ထုတ်ရန်',
    dragHint: 'ဖိဆွဲပြီး ၃၆၀° လှည့်ကြည့်ပါ · Scroll ဖြင့် ချဲ့ကြည့်ပါ',
    modalTitle: 'အင်္ကျီအသစ် ထည့်သွင်းရန်',
    modalSubtitle:
      'အရှေ့ပုံနှင့် အနောက်ပုံ ခွဲထည့်နိုင်သလို နှစ်ခုတွဲပုံမှလည်း ခွဲထုတ်နိုင်ပါသည်။',
    createAndView: '၃၆၀° ဖြင့် ကြည့်ရှုမည်',
    cancel: 'မလုပ်တော့ပါ',
    singleSheetUpload: 'ရှေ့+နောက် တွဲပါပုံ',
    separateUpload: 'ရှေ့ / နောက် သီးသန့်ပုံ',
    splitPosition: 'အလယ်ခွဲမျဉ်း',
  },
};
