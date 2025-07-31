import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';
import  language  from '../../lang/language_module.mjs';
import { CustomizeStyle } from '../../style/CustomizeStyle.js';

export class CustomizeView extends LitElement {
    static styles = CustomizeStyle; // Importing the styles from CustomizeStyle.js
 
    static properties = {
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedAppLanguage: { type: String }, //TODO: OSCARDO
        selectedScreenshotInterval: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        keybinds: { type: Object },
        googleSearchEnabled: { type: Boolean },
        backgroundTransparency: { type: Number },
        fontSize: { type: Number },
        onProfileChange: { type: Function },
        onLanguageChange: { type: Function },
        onLanguageAppChange: { type: Function }, //TODO: Oscardo
        onScreenshotIntervalChange: { type: Function },
        onImageQualityChange: { type: Function },
        onLayoutModeChange: { type: Function },
        advancedMode: { type: Boolean },
        onAdvancedModeChange: { type: Function },

        temp: {type: String},
        Profile_AI_Profile: {type: String},
        Profile_Type: {type: String},
        Profile_Custom_AI_Instructions: {type: String},
        Profile_Add_placeholder: {type: String},
        Profile_Personalize: {type: String},
        Profile_base_prompts: {type: String},
        Language_Language_Application: {type: String},
        Language_Speech_Language: {type: String},
        Language_Message: {type: String},
        LangIA_Language_Audio: {type: String},
        LangIA_Speech_Language:  {type: String},
        LangIA_Language: {type: String},
        Layout_Interface_Layout: {type: String},
        Layout_Mode: {type: String},
        Layout_Smaller: {type: String},
        Layout_Standard: {type: String},
        Layout_Background: {type: String},
        Layout_Transparent: {type: String},
        Layout_Opaque: {type: String},
        Layout_Adjust: {type: String},
        Layout_Font: {type: String},
        Layout_AdjustFont: {type: String},
        Screen_Capture: {type: String},
        Screen_Capture_Interval: {type: String},
        Screen_Manual: {type: String},
        Screen_1: {type: String},
        Screen_2: {type: String},
        Screen_5: {type: String},
        Screen_10: {type: String},
        Screen_Screenshots: {type: String},
        Screen_Automatic: {type: String},
        Screen_Image: {type: String},
        Screen_Image_High: {type: String},
        Screen_Image_Medium: {type: String},
        Screen_Image_Low: {type: String},
        Screen_Image_High_quality: {type: String},
        Screen_Image_Medium_quality: {type: String},
        Screen_Image_Low_quality: {type: String},
        Keyboard_Shortcuts: {type: String},
        Keyboard_Action: {type: String},
        Keyboard_Shortcut: {type: String},
        Keyboard_Reset: {type: String},
        Keyboard_Restore: {type: String},
        Google_Search: {type: String},
        Google_Enable: {type: String},
        Google_Allow: {type: String},
        Google_Note: {type: String},
        Google_Changes: {type: String},
        Message_Impotant:  {type: String},        
        Advanced:  {type: String},        
        Advanced_Enable:  {type: String},        
        Advanced_Unlock:  {type: String},        
        Advanced_Advanced_mode:  {type: String},        
        getKeybind_Move_Window_Up: {type: String},
        getKeybind_Move_Window_Up_Message: {type: String},
        getKeybind_Move_Window_Down: {type: String},
        getKeybind_Move_Window_Down_Message: {type: String},
        getKeybind_Move_Window_Left: {type: String},
        getKeybind_Move_Window_Message: {type: String},
        getKeybind_Move_Window_Right: {type: String},
        getKeybind_Move_Window_Right_Message: {type: String},
        getKeybind_Toggle_Window_Visibility: {type: String},
        getKeybind_Toggle_Window_Visibility_Message: {type: String},
        getKeybind_Toggle_Click_through_Mode: {type: String},
        getKeybind_Toggle_Click_through_Msg: {type: String},
        getKeybind_Ask_Next_Step: {type: String},
        getKeybind_Ask_Next_Step_Message: {type: String},
        getKeybind_Previous_Response: {type: String},
        getKeybind_Previous_Response_Message: {type: String},
        getKeybind_Next_Response: {type: String},
        getKeybind_Next_Response_Message: {type: String},
        getKeybind_Scroll_Response_Up: {type: String},
        getKeybind_Scroll_Response_Up_Message: {type: String},
        getKeybind_Scroll_Response_Down: {type: String},
        getKeybind_Scroll_Response_Down_Message: {type: String},
        Language_App_Accept: {type: String}
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-US';
        this.selectedAppLanguage = 'en-US'; //TODO: OSCARDO
        this.selectedScreenshotInterval = '5';
        this.selectedImageQuality = 'medium';
        this.layoutMode = 'normal';
        this.keybinds = this.getDefaultKeybinds();
        this.onProfileChange = () => {};
        this.onLanguageChange = () => {};
        this.onLanguageAppChange = () => {}; //TODO: OSCARDO
        this.onScreenshotIntervalChange = () => {};
        this.onImageQualityChange = () => {};
        this.onLayoutModeChange = () => {};
        this.onAdvancedModeChange = () => {};

        this.onTranslate(); // Initialize translations
        
        // Google Search default
        this.googleSearchEnabled = true;

        // Advanced mode default
        this.advancedMode = false;

        // Background transparency default
        this.backgroundTransparency = 0.8;

        // Font size default (in pixels)
        this.fontSize = 20;

        this.getLanguageAppSelect(); //TODO: OSCARDO

        this.loadKeybinds();
        this.loadGoogleSearchSettings();
        this.loadAdvancedModeSettings();
        this.loadBackgroundTransparency();
        this.loadFontSize();
       // this.loadLayoutMode(); // Load layout mode for display purposes TODO: OSCARDO
    }

    /** * Handles the translation of the component's text content.
     *  This method is called to update the component's properties with translated text.
     *  * @async
     *  * @function onTranslate
     *  *  @returns {void}
     * This method does not return a value. It updates the component's properties with translated text.
     * @memberof CustomizeView
     * */
    onTranslate(){
        this.translate("greeting").then((lang)=> 
            this.temp = lang
        );
        //Profile
        this.translate("Profile_AI_Profile").then((lang)=> 
            this.Profile_AI_Profile = lang
        );
		this.translate("Profile_Type").then((lang)=> 
            this.Profile_Type = lang
        );
		this.translate("Profile_Custom_AI_Instructions").then((lang)=> 
            this.Profile_Custom_AI_Instructions = lang
        );
		this.translate("Profile_Custom_AI_Instructions").then((lang)=> 
            this.Profile_Custom_AI_Instructions = lang
        );
		this.translate("Profile_Personalize").then((lang)=> 
            this.Profile_Personalize = lang
        );
		this.translate("Profile_base_prompts").then((lang)=> 
            this.Profile_base_prompts = lang
        );
        //Language app
        this.translate("Language_Language_Application").then((lang)=> 
            this.Language_Language_Application = lang
        );
        this.translate("Language_Speech_Language").then((lang)=> 
            this.Language_Speech_Language = lang
        );
        this.translate("Language_Message").then((lang)=> 
            this.Language_Message = lang
        );
        //LanguageIA
        this.translate("LangIA_Language_Audio").then((lang)=> 
            this.LangIA_Language_Audio = lang
        );
        this.translate("LangIA_Speech_Language").then((lang)=> 
            this.LangIA_Speech_Language = lang
        );
        this.translate("LangIA_Language").then((lang)=> 
            this.LangIA_Language = lang
        );
        //Layout
		this.translate("Layout_Interface_Layout").then((lang)=> 
            this.Layout_Interface_Layout = lang
        );
		this.translate("Layout_Mode").then((lang)=> 
            this.Layout_Mode = lang
        );
		this.translate("Layout_Smaller").then((lang)=> 
            this.Layout_Smaller = lang
        );
		this.translate("Layout_Standard").then((lang)=> 
            this.Layout_Standard = lang
        );
		this.translate("Layout_Transparent").then((lang)=> 
            this.Layout_Transparent = lang
        );
		this.translate("Layout_Background").then((lang)=> 
            this.Layout_Background = lang
        );
		this.translate("Layout_Opaque").then((lang)=> 
            this.Layout_Opaque = lang
        );
		this.translate("Layout_Adjust").then((lang)=> 
            this.Layout_Adjust = lang
        );
		this.translate("Layout_Font").then((lang)=> 
            this.Layout_Font = lang
        );
		this.translate("Layout_AdjustFont").then((lang)=> 
            this.Layout_AdjustFont = lang
        );
        //Screen
        this.translate("Screen_Capture").then((lang) =>
            this.Screen_Capture = lang
        );

        this.translate("Screen_Capture_Interval").then((lang) =>
            this.Screen_Capture_Interval = lang
        );

        this.translate("Screen_Manual").then((lang) =>
            this.Screen_Manual = lang
        );

        this.translate("Screen_1").then((lang) =>
            this.Screen_1 = lang
        );

        this.translate("Screen_2").then((lang) =>
            this.Screen_2 = lang
        );

        this.translate("Screen_5").then((lang) =>
            this.Screen_5 = lang
        );

        this.translate("Screen_10").then((lang) =>
            this.Screen_10 = lang
        );

        this.translate("Screen_Screenshots").then((lang) =>
            this.Screen_Screenshots = lang
        );

        this.translate("Screen_Automatic").then((lang) =>
            this.Screen_Automatic = lang
        );

        this.translate("Screen_Image").then((lang) =>
            this.Screen_Image = lang
        );

        this.translate("Screen_Image_High").then((lang) =>
            this.Screen_Image_High = lang
        );

        this.translate("Screen_Image_Medium").then((lang) =>
            this.Screen_Image_Medium = lang
        );

        this.translate("Screen_Image_Low").then((lang) =>
            this.Screen_Image_Low = lang
        );

        this.translate("Screen_Image_High_quality").then((lang) =>
            this.Screen_Image_High_quality = lang
        );

        this.translate("Screen_Image_Medium_quality").then((lang) =>
            this.Screen_Image_Medium_quality = lang
        );

        this.translate("Screen_Image_Low_quality").then((lang) =>
            this.Screen_Image_Low_quality = lang
        );
        //Keyboard
        this.translate("Keyboard_Shortcuts").then((lang) =>
            this.Keyboard_Shortcuts = lang
        );
        this.translate("Keyboard_Action").then((lang) =>
            this.Keyboard_Action = lang
        );
        this.translate("Keyboard_Shortcut").then((lang) =>
            this.Keyboard_Shortcut = lang
        );
        this.translate("Keyboard_Reset").then((lang) =>
            this.Keyboard_Reset = lang
        );
        this.translate("Keyboard_Restore").then((lang) =>
            this.Keyboard_Restore = lang
        );
        //Google
        this.translate("Google Search").then((lang) => {
             this.Google_Search = lang;
        });
        this.translate("Google_Enable").then((lang) => {
            this.Google_Enable = lang;
        });

        this.translate("Google_Allow").then((lang) => {
            this.Google_Allow = lang;
        });

        this.translate("Google_Note").then((lang) => {
            this.Google_Note = lang;
        });

        this.translate("Google_Changes").then((lang) => {
            this.Google_Changes = lang;
        });
        this.translate("Message_Impotant").then((lang) => {
            this.Message_Impotant = lang;
        });
        this.translate("Advanced").then((lang) => {
             this.Advanced = lang;
        });
        this.translate("Advanced_Enable").then((lang) => {
            this.Advanced_Enable = lang;
        });

        this.translate("Advanced_Unlock").then((lang) => {
            this.Advanced_Unlock = lang;
        });

        this.translate("Advanced_Advanced_mode").then((lang) => {
            this.Advanced_Advanced_mode = lang;
        });
        //getKeyBing
        this.translate("getKeybind_Move_Window_Up").then((lang)=> 
            this.getKeybind_Move_Window_Up = lang
        );
        this.translate("getKeybind_Move_Window_Up_Message").then((lang)=> 
            this.getKeybind_Move_Window_Up_Message = lang
        );
        this.translate("getKeybind_Move_Window_Down").then((lang)=> 
            this.getKeybind_Move_Window_Down = lang
        );
        this.translate("getKeybind_Move_Window_Down_Message").then((lang)=> 
            this.getKeybind_Move_Window_Down_Message = lang
        );
        this.translate("getKeybind_Move_Window_Left").then((lang)=> 
            this.getKeybind_Move_Window_Left = lang
        );
        this.translate("getKeybind_Move_Window_Message").then((lang)=> 
            this.getKeybind_Move_Window_Message = lang
        );
        this.translate("getKeybind_Move_Window_Right").then((lang)=> 
            this.getKeybind_Move_Window_Right = lang
        );
        this.translate("getKeybind_Move_Window_Right_Message").then((lang)=> 
            this.getKeybind_Move_Window_Right_Message = lang
        );
        this.translate("getKeybind_Toggle_Window_Visibility").then((lang)=> 
            this.getKeybind_Toggle_Window_Visibility = lang
        );
        this.translate("getKeybind_Toggle_Window_Visibility_Message").then((lang)=> 
            this.getKeybind_Toggle_Window_Visibility_Message = lang
        );
        this.translate("getKeybind_Toggle_Click_through_Mode").then((lang)=> 
            this.getKeybind_Toggle_Click_through_Mode = lang
        );
        this.translate("getKeybind_Toggle_Click_through_Msg").then((lang)=> 
            this.getKeybind_Toggle_Click_through_Msg = lang
        );
        this.translate("getKeybind_Ask_Next_Step").then((lang)=> 
            this.getKeybind_Ask_Next_Step = lang
        );
        this.translate("getKeybind_Ask_Next_Step_Message").then((lang)=> 
            this.getKeybind_Ask_Next_Step_Message = lang
        );
        this.translate("getKeybind_Previous_Response").then((lang)=> 
            this.getKeybind_Previous_Response = lang
        );
        this.translate("getKeybind_Previous_Response_Message").then((lang)=> 
            this.getKeybind_Previous_Response_Message = lang
        );
        this.translate("getKeybind_Next_Response").then((lang)=> 
            this.getKeybind_Next_Response = lang
        );
        this.translate("getKeybind_Next_Response_Message").then((lang)=> 
            this.getKeybind_Next_Response_Message = lang
        );
        this.translate("getKeybind_Scroll_Response_Up").then((lang)=> 
            this.getKeybind_Scroll_Response_Up = lang
        );
        this.translate("getKeybind_Scroll_Response_Up_Message").then((lang)=> 
            this.getKeybind_Scroll_Response_Up_Message = lang
        );
        this.translate("getKeybind_Scroll_Response_Down").then((lang)=> 
            this.getKeybind_Scroll_Response_Down = lang
        );
        this.translate("getKeybind_Scroll_Response_Down_Message").then((lang)=> 
            this.getKeybind_Scroll_Response_Down_Message = lang
        );
        this.translate("Language_App_Accept").then((lang)=> 
            this.Language_App_Accept = lang 
        );
    }

    connectedCallback() {
        super.connectedCallback();
        // Load layout mode for display purposes
        this.loadLayoutMode();
        // Resize window for this view
        resizeLayout();
    }

    getProfiles() {
        return [
            {
                value: 'interview',
                name: 'Job Interview',
                description: 'Get help with answering interview questions',
            },
            {
                value: 'sales',
                name: 'Sales Call',
                description: 'Assist with sales conversations and objection handling',
            },
            {
                value: 'meeting',
                name: 'Business Meeting',
                description: 'Support for professional meetings and discussions',
            },
            {
                value: 'presentation',
                name: 'Presentation',
                description: 'Help with presentations and public speaking',
            },
            {
                value: 'negotiation',
                name: 'Negotiation',
                description: 'Guidance for business negotiations and deals',
            },
            {
                value: 'exam',
                name: 'Exam Assistant',
                description: 'Academic assistance for test-taking and exam questions',
            },
        ];
    }

    getLanguages() {
        return [
            { value: 'en-US', name: 'English (US)' },
            { value: 'en-GB', name: 'English (UK)' },
            { value: 'en-AU', name: 'English (Australia)' },
            { value: 'en-IN', name: 'English (India)' },
            { value: 'de-DE', name: 'German (Germany)' },
            { value: 'es-US', name: 'Spanish (United States)' },
            { value: 'es-ES', name: 'Spanish (Spain)' },
            { value: 'fr-FR', name: 'French (France)' },
            { value: 'fr-CA', name: 'French (Canada)' },
            { value: 'hi-IN', name: 'Hindi (India)' },
            { value: 'pt-BR', name: 'Portuguese (Brazil)' },
            { value: 'ar-XA', name: 'Arabic (Generic)' },
            { value: 'id-ID', name: 'Indonesian (Indonesia)' },
            { value: 'it-IT', name: 'Italian (Italy)' },
            { value: 'ja-JP', name: 'Japanese (Japan)' },
            { value: 'tr-TR', name: 'Turkish (Turkey)' },
            { value: 'vi-VN', name: 'Vietnamese (Vietnam)' },
            { value: 'bn-IN', name: 'Bengali (India)' },
            { value: 'gu-IN', name: 'Gujarati (India)' },
            { value: 'kn-IN', name: 'Kannada (India)' },
            { value: 'ml-IN', name: 'Malayalam (India)' },
            { value: 'mr-IN', name: 'Marathi (India)' },
            { value: 'ta-IN', name: 'Tamil (India)' },
            { value: 'te-IN', name: 'Telugu (India)' },
            { value: 'nl-NL', name: 'Dutch (Netherlands)' },
            { value: 'ko-KR', name: 'Korean (South Korea)' },
            { value: 'cmn-CN', name: 'Mandarin Chinese (China)' },
            { value: 'pl-PL', name: 'Polish (Poland)' },
            { value: 'ru-RU', name: 'Russian (Russia)' },
            { value: 'th-TH', name: 'Thai (Thailand)' },
        ];
    }

    //TODO: OSCARDO
    
    getLanguagesApp() {
        return [
            { value: 'en-US', name: 'English (US)' },
            { value: 'pt-BR', name: 'Portuguese (Brazil)' },
            { value: 'es-CO', name: 'Spanish (Colombia)' }
        ];
    }
    
    /**
    * Translates a specified key into a localized message, using the current system language.
    * @async
    * @function translate
    * @param {string} key - Message key to translate.
    * Expected values:
    * 'Main_api', 'Main_GetApi', 'Main_Welcome',
    * 'Main_APIKey', 'Main_Start'.
    * If the key does not match, 'unknowledge' will be used as the default key.
    * @returns {Promise<string>} - Returns a Promise that resolves to the translated text
    * corresponding to the provided key.
    * If the text is not found, 'Unknowledge' is returned.
    * @example
    * const message = await translate("Main_Welcome");
    * console. log(message); // "Welcome to the app" (depends on the current language)
    */
    async translate(key) {
    let temp = ''; // Usa 'let' si vas a reasignar
    switch (key) {
        case 'Profile_AI_Profile':
            temp = await language.getMessages("Profile_AI_Profile", language.getLanguage() || 'en-US');
            break;
        case 'Profile_Type':
            temp = await language.getMessages("Profile_Type", language.getLanguage() || 'en-US');
            break;
        case 'Profile_AI_Profile':
            temp = await language.getMessages("Profile_AI_Profile", language.getLanguage() || 'en-US');
            break;
        case 'Profile_Custom_AI_Instructions':
            temp = await language.getMessages("Profile_Custom_AI_Instructions", language.getLanguage() || 'en-US');
            break;
        case 'Profile_Personalize':
            temp = await language.getMessages("Profile_Personalize", language.getLanguage() || 'en-US');
            break;
        case 'Profile_base_prompts':
            temp = await language.getMessages("Profile_base_prompts", language.getLanguage() || 'en-US');
            break;
        case 'Language_Language_Application':
            temp = await language.getMessages("Language_Language_Application", language.getLanguage() || 'en-US');
            break;
        case 'Language_Speech_Language':
            temp = await language.getMessages("Language_Speech_Language", language.getLanguage() || 'en-US');
            break;
        case 'Language_Message':
            temp = await language.getMessages("Language_Message", language.getLanguage() || 'en-US');
            break;
        case 'LangIA_Language_Audio':
            temp = await language.getMessages("LangIA_Language_Audio", language.getLanguage() || 'en-US');
            break;
        case 'LangIA_Speech_Language':
            temp = await language.getMessages("LangIA_Speech_Language", language.getLanguage() || 'en-US');
            break;
        case 'LangIA_Language':
            temp = await language.getMessages("LangIA_Language", language.getLanguage() || 'en-US');
            break;
        case 'Layout_Interface_Layout':
            temp = await language.getMessages("Layout_Interface_Layout", language.getLanguage() || 'en-US');
            break;
		case 'Layout_Mode':
            temp = await language.getMessages("Layout_Mode", language.getLanguage() || 'en-US');
            break;
		case 'Layout_Smaller':
            temp = await language.getMessages("Layout_Smaller", language.getLanguage() || 'en-US');
            break;
		case 'Layout_Standard':
            temp = await language.getMessages("Layout_Standard", language.getLanguage() || 'en-US');
            break;
		case 'Layout_Background':
            temp = await language.getMessages("Layout_Background", language.getLanguage() || 'en-US');
            break;
		case 'Layout_Transparent':
            temp = await language.getMessages("Layout_Transparent", language.getLanguage() || 'en-US');
            break;
		case 'Layout_Opaque':
            temp = await language.getMessages("Layout_Opaque", language.getLanguage() || 'en-US');
            break;
		case 'Layout_Adjust':
            temp = await language.getMessages("Layout_Adjust", language.getLanguage() || 'en-US');
            break;
		case 'Layout_Font':
            temp = await language.getMessages("Layout_Font", language.getLanguage() || 'en-US');
            break;
		case 'Layout_AdjustFont':
            temp = await language.getMessages("Layout_AdjustFont", language.getLanguage() || 'en-US');
            break;
            case 'Screen_Capture':
        temp = await language.getMessages("Screen_Capture", language.getLanguage() || 'en-US');
        break;
        case 'Screen_Capture_Interval':
            temp = await language.getMessages("Screen_Capture_Interval", language.getLanguage() || 'en-US');
            break;
        case 'Screen_Manual':
            temp = await language.getMessages("Screen_Manual", language.getLanguage() || 'en-US');
            break;
        case 'Screen_1':
            temp = await language.getMessages("Screen_1", language.getLanguage() || 'en-US');
            break;
        case 'Screen_2':
            temp = await language.getMessages("Screen_2", language.getLanguage() || 'en-US');
            break;
        case 'Screen_5':
            temp = await language.getMessages("Screen_5", language.getLanguage() || 'en-US');
            break;
        case 'Screen_10':
            temp = await language.getMessages("Screen_10", language.getLanguage() || 'en-US');
            break;
        case 'Screen_Screenshots':
            temp = await language.getMessages("Screen_Screenshots", language.getLanguage() || 'en-US');
            break;
        case 'Screen_Automatic':
            temp = await language.getMessages("Screen_Automatic", language.getLanguage() || 'en-US');
            break;
        case 'Screen_Image':
            temp = await language.getMessages("Screen_Image", language.getLanguage() || 'en-US');
            break;
        case 'Screen_Image_High':
            temp = await language.getMessages("Screen_Image_High", language.getLanguage() || 'en-US');
            break;
        case 'Screen_Image_Medium':
            temp = await language.getMessages("Screen_Image_Medium", language.getLanguage() || 'en-US');
            break;
        case 'Screen_Image_Low':
            temp = await language.getMessages("Screen_Image_Low", language.getLanguage() || 'en-US');
            break;
        case 'Screen_Image_High_quality':
            temp = await language.getMessages("Screen_Image_High_quality", language.getLanguage() || 'en-US');
            break;
        case 'Screen_Image_Medium_quality':
            temp = await language.getMessages("Screen_Image_Medium_quality", language.getLanguage() || 'en-US');
            break;
        case 'Screen_Image_Low_quality':
            temp = await language.getMessages("Screen_Image_Low_quality", language.getLanguage() || 'en-US');
            break;
        case 'Keyboard_Shortcuts':
            temp = await language.getMessages("Keyboard_Shortcuts", language.getLanguage() || 'en-US');
        break;
        case 'Keyboard_Action':
            temp = await language.getMessages("Keyboard_Action", language.getLanguage() || 'en-US');
            break;
        case 'Keyboard_Shortcut':
            temp = await language.getMessages("Keyboard_Shortcut", language.getLanguage() || 'en-US');
            break;
        case 'Keyboard_Reset':
            temp = await language.getMessages("Keyboard_Reset", language.getLanguage() || 'en-US');
            break;
        case 'Keyboard_Restore':
            temp = await language.getMessages("Keyboard_Restore", language.getLanguage() || 'en-US');
            break;
        case 'Google Search':
            temp = await language.getMessages("Google Search", language.getLanguage() || 'en-US');
            break;
        case 'Google_Enable':
            temp = await language.getMessages("Google_Enable", language.getLanguage() || 'en-US');
            break;
        case 'Google_Allow':
            temp = await language.getMessages("Google_Allow", language.getLanguage() || 'en-US');
            break;
        case 'Google_Note':
            temp = await language.getMessages("Google_Note", language.getLanguage() || 'en-US');
            break;
        case 'Google_Changes':
            temp = await language.getMessages("Google_Changes", language.getLanguage() || 'en-US');
            break;
        case 'Message_Impotant':
            temp = await language.getMessages("Message_Impotant", language.getLanguage() || 'en-US');
            break;
        case 'Advanced':
            temp = await language.getMessages("Advanced", language.getLanguage() || 'en-US');
            break;
        case 'Advanced_Enable':
            temp = await language.getMessages("Advanced_Enable", language.getLanguage() || 'en-US');
            break;
        case 'Advanced_Unlock':
            temp = await language.getMessages("Advanced_Unlock", language.getLanguage() || 'en-US');
            break;
        case 'Advanced_Advanced_mode':
            temp = await language.getMessages("Advanced_Advanced_mode", language.getLanguage() || 'en-US');
            break;
        case 'Speech_Language':
            // Asumiendo que language.getMessages devuelve una Promesa
            temp = await language.getMessages("Speech_Language", language.getLanguage() || 'en-US');
            break;
        case 'greeting':
            // Asumiendo que language.getMessage devuelve una Promesa
            temp = await language.getMessage("greeting", language.getLanguage() || 'en-US');
            break;
        case 'welcome_message':
            // Asumiendo que language.getMessage devuelve una Promesa
            temp = await language.getMessage("welcome_message", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Move_Window_Up':
            temp = await language.getMessage("getKeybind_Move_Window_Up", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Move_Window_Up_Message':
            temp = await language.getMessage("getKeybind_Move_Window_Up_Message", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Move_Window_Down':
            temp = await language.getMessage("getKeybind_Move_Window_Down", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Move_Window_Down_Message':
            temp = await language.getMessage("getKeybind_Move_Window_Down_Message", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Move_Window_Left':
            temp = await language.getMessage("getKeybind_Move_Window_Left", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Move_Window_Message':
            temp = await language.getMessage("getKeybind_Move_Window_Message", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Move_Window_Right':
            temp = await language.getMessage("getKeybind_Move_Window_Right", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Move_Window_Right_Message':
            temp = await language.getMessage("getKeybind_Move_Window_Right_Message", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Toggle_Window_Visibility':
            temp = await language.getMessage("getKeybind_Toggle_Window_Visibility", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Toggle_Window_Visibility_Message':
            temp = await language.getMessage("getKeybind_Toggle_Window_Visibility_Message", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Toggle_Click_through_Mode':
            temp = await language.getMessage("getKeybind_Toggle_Click_through_Mode", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Toggle_Click_through_Msg':
            temp = await language.getMessage("getKeybind_Toggle_Click_through_Msg", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Ask_Next_Step':
            temp = await language.getMessage("getKeybind_Ask_Next_Step", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Ask_Next_Step_Message':
            temp = await language.getMessage("getKeybind_Ask_Next_Step_Message", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Previous_Response':
            temp = await language.getMessage("getKeybind_Previous_Response", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Previous_Response_Message':
            temp = await language.getMessage("getKeybind_Previous_Response_Message", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Next_Response':
            temp = await language.getMessage("getKeybind_Next_Response", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Next_Response_Message':
            temp = await language.getMessage("getKeybind_Next_Response_Message", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Scroll_Response_Up':
            temp = await language.getMessage("getKeybind_Scroll_Response_Up", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Scroll_Response_Up_Message':
            temp = await language.getMessage("getKeybind_Scroll_Response_Up_Message", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Scroll_Response_Down':
            temp = await language.getMessage("getKeybind_Scroll_Response_Down", language.getLanguage() || 'en-US');
            break;
        case 'getKeybind_Scroll_Response_Down_Message':
            temp = await language.getMessage("getKeybind_Scroll_Response_Down_Message", language.getLanguage() || 'en-US');
            break;    
        case 'Language_App_Accept':
            temp = await language.getMessage("Language_App_Accept", language.getLanguage() || 'en-US');
            break;    
        default:
            // Si quieres un valor por defecto que también es una Promesa
            return await language.getMessages("Speech_Language", 'en-US');
    }
    // Asegúrate de que 'temp' siempre sea una cadena o el tipo esperado
        return temp || 'Unknowlagde';
    }    

    /* Oscardo */
    async handleLanguageAppSelect(e) {
        this.selectedAppLanguage = e.target.value;
        localStorage.setItem('selectedAppLanguage', this.selectedAppLanguage);
        this.onLanguageAppChange(this.selectedAppLanguage);
        this.requestUpdate();
        // Update the language in the main process
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-app-language', this.selectedAppLanguage);
        }
        // Update the language in the translate function
        
    }

    async getLanguageAppSelect(){
        try{
            this.selectedAppLanguage = localStorage.getItem('selectedAppLanguage') || 'en-US';
            return this.translate('Speech_Language');
        }catch(error){
            console.error(error);
        }
    }
    /* Oscardo */
    //TODO: OSCARDO

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
            exam: 'Exam Assistant',
        };
    }

    handleProfileSelect(e) {
        this.selectedProfile = e.target.value;
        localStorage.setItem('selectedProfile', this.selectedProfile);
        this.onProfileChange(this.selectedProfile);
    }

    handleLanguageSelect(e) {
        this.selectedLanguage = e.target.value;
        localStorage.setItem('selectedLanguage', this.selectedLanguage);
        this.onLanguageChange(this.selectedLanguage);
    }

    handleScreenshotIntervalSelect(e) {
        this.selectedScreenshotInterval = e.target.value;
        localStorage.setItem('selectedScreenshotInterval', this.selectedScreenshotInterval);
        this.onScreenshotIntervalChange(this.selectedScreenshotInterval);
    }

    handleImageQualitySelect(e) {
        this.selectedImageQuality = e.target.value;
        this.onImageQualityChange(e.target.value);
    }

    handleLayoutModeSelect(e) {
        this.layoutMode = e.target.value;
        localStorage.setItem('layoutMode', this.layoutMode);
        this.onLayoutModeChange(e.target.value);
    }

    handleCustomPromptInput(e) {
        localStorage.setItem('customPrompt', e.target.value);
    }

    getDefaultKeybinds() {
        const isMac = cheddar.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        };
    }

    loadKeybinds() {
        const savedKeybinds = localStorage.getItem('customKeybinds');
        if (savedKeybinds) {
            try {
                this.keybinds = { ...this.getDefaultKeybinds(), ...JSON.parse(savedKeybinds) };
            } catch (e) {
                console.error('Failed to parse saved keybinds:', e);
                this.keybinds = this.getDefaultKeybinds();
            }
        }
    }

    saveKeybinds() {
        localStorage.setItem('customKeybinds', JSON.stringify(this.keybinds));
        // Send to main process to update global shortcuts
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    handleKeybindChange(action, value) {
        this.keybinds = { ...this.keybinds, [action]: value };
        this.saveKeybinds();
        this.requestUpdate();
    }

    resetKeybinds() {
        this.keybinds = this.getDefaultKeybinds();
        localStorage.removeItem('customKeybinds');
        this.requestUpdate();
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    getKeybindActions() {
        return [
            {
                key: 'moveUp',
                name: `${this.getKeybind_Move_Window_Up || 'Move Window Up'}`, 
                description: `${this.getKeybind_Move_Window_Up_Message || 'Move the application window up'}`,
            },
            {
                key: 'moveDown',
                name: `${this.getKeybind_Move_Window_Down || 'Move Window Up'}`, 
                description: `${this.getKeybind_Move_Window_Down_Message || 'Move the application window down'}`,
            },
            {
                key: 'moveLeft',
                name: `${this.getKeybind_Move_Window_Left || 'Move Window Left'}`, 
                description: `${this.getKeybind_Move_Window_Left_Message || 'Move the application window left'}`,
            },
            {
                key: 'moveRight',
                name: `${this.getKeybind_Move_Window_Right || 'Move Window Right'}`, 
                description: `${this.getKeybind_Move_Window_Right_Message || 'Move the application window right'}`,
            },
            {
                key: 'toggleVisibility',
                name: `${this.getKeybind_Toggle_Window_Visibility || 'Toggle Window Visibility'}`, 
                description: `${this.getKeybind_Toggle_Window_Visibility_Message || 'Show/hide the application window'}`,
            },
            {
                key: 'toggleClickThrough',
                name: `${this.getKeybind_Toggle_Click_through_Mode || 'Toggle Click-through Mode'}`, 
                description: `${this.getKeybind_Toggle_Click_through_Msg || 'Enable/disable click-through functionality'}`,
            },
            {
                key: 'nextStep',
                name: `${this.getKeybind_Ask_Next_Step || 'Ask Next Step'}`, 
                description: `${this.getKeybind_Ask_Next_Step_Message || 'Take screenshot and ask AI for the next step suggestion'}`,
            },
            {
                key: 'previousResponse',
                name: `${this.getKeybind_Previous_Response || 'Previous Response'}`, 
                description: `${this.getKeybind_Previous_Response_Message || 'Navigate to the previous AI response'}`,
            },
            {
                key: 'nextResponse',
                name: `${this.getKeybind_Next_Response || 'Next Response'}`, 
                description: `${this.getKeybind_Next_Response_Message || 'Navigate to the next AI response'}`,
            },
            {
                key: 'scrollUp',
                name: `${this.getKeybind_Scroll_Response_Up || 'Scroll Response Up'}`, 
                description: `${this.getKeybind_Scroll_Response_Up_Message || 'Scroll the AI response content up'}`,
            },
            {
                key: 'scrollDown',
                name: `${this.getKeybind_Scroll_Response_Down || 'Scroll Response Down'}`,
                description: `${this.getKeybind_Scroll_Response_Down_Message || 'Scroll the AI response content down'}`,
            },
        ];
    }

    handleKeybindFocus(e) {
        e.target.placeholder = 'Press key combination...';
        e.target.select();
    }

    handleKeybindInput(e) {
        e.preventDefault();

        const modifiers = [];
        const keys = [];

        // Check modifiers
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push('Cmd');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        // Get the main key
        let mainKey = e.key;

        // Handle special keys
        switch (e.code) {
            case 'ArrowUp':
                mainKey = 'Up';
                break;
            case 'ArrowDown':
                mainKey = 'Down';
                break;
            case 'ArrowLeft':
                mainKey = 'Left';
                break;
            case 'ArrowRight':
                mainKey = 'Right';
                break;
            case 'Enter':
                mainKey = 'Enter';
                break;
            case 'Space':
                mainKey = 'Space';
                break;
            case 'Backslash':
                mainKey = '\\';
                break;
            case 'KeyS':
                if (e.shiftKey) mainKey = 'S';
                break;
            case 'KeyM':
                mainKey = 'M';
                break;
            default:
                if (e.key.length === 1) {
                    mainKey = e.key.toUpperCase();
                }
                break;
        }

        // Skip if only modifier keys are pressed
        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
            return;
        }

        // Construct keybind string
        const keybind = [...modifiers, mainKey].join('+');

        // Get the action from the input's data attribute
        const action = e.target.dataset.action;

        // Update the keybind
        this.handleKeybindChange(action, keybind);

        // Update the input value
        e.target.value = keybind;
        e.target.blur();
    }

    loadGoogleSearchSettings() {
        const googleSearchEnabled = localStorage.getItem('googleSearchEnabled');
        if (googleSearchEnabled !== null) {
            this.googleSearchEnabled = googleSearchEnabled === 'true';
        }
    }

    async handleGoogleSearchChange(e) {
        this.googleSearchEnabled = e.target.checked;
        localStorage.setItem('googleSearchEnabled', this.googleSearchEnabled.toString());

        // Notify main process if available
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-google-search-setting', this.googleSearchEnabled);
            } catch (error) {
                console.error('Failed to notify main process:', error);
            }
        }

        this.requestUpdate();
    }

    loadLayoutMode() {
        const savedLayoutMode = localStorage.getItem('layoutMode');
        if (savedLayoutMode) {
            this.layoutMode = savedLayoutMode;
        }
    }

    loadAdvancedModeSettings() {
        const advancedMode = localStorage.getItem('advancedMode');
        if (advancedMode !== null) {
            this.advancedMode = advancedMode === 'true';
        }
    }

    async handleAdvancedModeChange(e) {
        this.advancedMode = e.target.checked;
        localStorage.setItem('advancedMode', this.advancedMode.toString());
        this.onAdvancedModeChange(this.advancedMode);
        this.requestUpdate();
    }

    loadBackgroundTransparency() {
        const backgroundTransparency = localStorage.getItem('backgroundTransparency');
        if (backgroundTransparency !== null) {
            this.backgroundTransparency = parseFloat(backgroundTransparency) || 0.8;
        }
        this.updateBackgroundTransparency();
    }

    handleBackgroundTransparencyChange(e) {
        this.backgroundTransparency = parseFloat(e.target.value);
        localStorage.setItem('backgroundTransparency', this.backgroundTransparency.toString());
        this.updateBackgroundTransparency();
        this.requestUpdate();
    }

    updateBackgroundTransparency() {
        const root = document.documentElement;
        root.style.setProperty('--header-background', `rgba(0, 0, 0, ${this.backgroundTransparency})`);
        root.style.setProperty('--main-content-background', `rgba(0, 0, 0, ${this.backgroundTransparency})`);
        root.style.setProperty('--card-background', `rgba(255, 255, 255, ${this.backgroundTransparency * 0.05})`);
        root.style.setProperty('--input-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.375})`);
        root.style.setProperty('--input-focus-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.625})`);
        root.style.setProperty('--button-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.625})`);
        root.style.setProperty('--preview-video-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 1.125})`);
        root.style.setProperty('--screen-option-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.5})`);
        root.style.setProperty('--screen-option-hover-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.75})`);
        root.style.setProperty('--scrollbar-background', `rgba(0, 0, 0, ${this.backgroundTransparency * 0.5})`);
    }

    loadFontSize() {
        const fontSize = localStorage.getItem('fontSize');
        if (fontSize !== null) {
            this.fontSize = parseInt(fontSize, 10) || 20;
        }
        this.updateFontSize();
    }

    handleFontSizeChange(e) {
        this.fontSize = parseInt(e.target.value, 10);
        localStorage.setItem('fontSize', this.fontSize.toString());
        this.updateFontSize();
        this.requestUpdate();
    }

    updateFontSize() {
        const root = document.documentElement;
        root.style.setProperty('--response-font-size', `${this.fontSize}px`);
    }

    //modify for Oscardo
    _Profile() {
    const profiles = this.getProfiles();
    const currentProfile = profiles.find(p => p.value === this.selectedProfile);
    const profileNames = this.getProfileNames();
    return html`
      <!-- Profile & Behavior Section -->
                <div class="settings-section">
                    <div class="section-title">
                        <span>${this.Profile_AI_Profile}</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    ${this.Profile_Type}
                                    <span class="current-selection">${currentProfile?.name || 'Unknown'}</span>
                                </label>
                                <select class="form-control" .value=${this.selectedProfile} @change=${this.handleProfileSelect}>
                                    ${profiles.map(
                                        profile => html`
                                            <option value=${profile.value} ?selected=${this.selectedProfile === profile.value}>
                                                ${profile.name}
                                            </option>
                                        `
                                    )}
                                </select>
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <label class="form-label">${this.Profile_Custom_AI_Instructions}</label>
                            <textarea
                                class="form-control"
                                placeholder="${this.Profile_Custom_AI_Instructions} ${
                                    profileNames[this.selectedProfile] || 'this interaction'
                                }..."
                                .value=${localStorage.getItem('customPrompt') || ''}
                                rows="4"
                                @input=${this.handleCustomPromptInput}></textarea>
                            <div class="form-description">
                                ${this.Profile_Personalize} 
                                ${profileNames[this.selectedProfile] || 'selected profile'} ${this.Profile_base_prompts}
                            </div>
                        </div>
                    </div>
        `;
    }//end _profile

    _language_application(){
        const languages = this.getLanguages();
        const currentLanguage = languages.find(l => l.value === this.selectedLanguage);
        const languagesApp = this.getLanguagesApp(); //TODO OSCARDO
        const currentApplicationLanguage = languagesApp.find(l => l.value === this.selectedAppLanguage); //TODO: OSCARDO

        let Speech_Language = '';
        return html`<div class="section-title">
                        <span>${this.Language_Language_Application}</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    ${this.Language_Speech_Language}
                                    <span class="current-selection">${currentApplicationLanguage?.name || 'English '}</span>
                                </label>
                                <table class="form-control">
                                <tr>    
                                <td>
                                <select class="form-control" .value=${this.selectedAppLanguage} @change=${this.handleLanguageAppSelect}>
                                    ${languagesApp.map(
                                        language => html`
                                            <option value=${language.value} ?selected=${this.selectedAppLanguage === language.value}>
                                                ${language.name}
                                            </option>
                                        `
                                    )}
                                </select>
                                </td>
                                <td>
                                    
                                </td>
                                </tr>
                                </table>
                                <div class="form-description">${this.Language_Message}</div>
                            </div>
                        </div>
                    </div>
        `;
    }//end _lenguage_application


    _language(){
        const languages = this.getLanguages();
        const currentLanguage = languages.find(l => l.value === this.selectedLanguage);
        const languagesApp = this.getLanguagesApp(); //TODO OSCARDO
        const currentApplicationLanguage = languagesApp.find(l => l.value === this.selectedAppLanguage); //TODO: OSCARDO
        return html`
        <div class="section-title">
                        <span>${this.LangIA_Language_Audio}</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    ${this.LangIA_Speech_Language}
                                    <span class="current-selection">${currentLanguage?.name || 'Unknown'}</span>
                                </label>
                                <select class="form-control" .value=${this.selectedLanguage} @change=${this.handleLanguageSelect}>
                                    ${languages.map(
                                        language => html`
                                            <option value=${language.value} ?selected=${this.selectedLanguage === language.value}>
                                                ${language.name}
                                            </option>
                                        `
                                    )}
                                </select>
                                <div class="form-description">${this.LangIA_Language}</div>
                            </div>
                        </div>
                    </div>
        `;
    }

    _interface_layout(){
        return html`
        <div class="section-title">
                        <span>${this.Layout_Interface_Layout}</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    ${this.Layout_Mode}
                                    <span class="current-selection">${this.layoutMode === 'compact' ? 'Compact' : 'Normal'}</span>
                                </label>
                                <select class="form-control" .value=${this.layoutMode} @change=${this.handleLayoutModeSelect}>
                                    <option value="normal" ?selected=${this.layoutMode === 'normal'}>Normal</option>
                                    <option value="compact" ?selected=${this.layoutMode === 'compact'}>Compact</option>
                                </select>
                                <div class="form-description">
                                    ${
                                        this.layoutMode === 'compact'
                                            ? `${this.Layout_Smaller}`
                                            : `${this.Layout_Standard}`
                                    }
                                </div>
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <div class="slider-container">
                                <div class="slider-header">
                                    <label class="form-label">${this.Layout_Background}</label>
                                    <span class="slider-value">${Math.round(this.backgroundTransparency * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    class="slider-input"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    .value=${this.backgroundTransparency}
                                    @input=${this.handleBackgroundTransparencyChange}
                                />
                                <div class="slider-labels">
                                    <span>${this.Layout_Transparent}</span>
                                    <span>${this.Layout_Opaque}</span>
                                </div>
                                <div class="form-description">
                                    ${this.Layout_Adjust}
                                </div>
                            </div>
                        </div>

                        <div class="form-group full-width">
                            <div class="slider-container">
                                <div class="slider-header">
                                    <label class="form-label">${this.Layout_Font}</label>
                                    <span class="slider-value">${this.fontSize} px</span>
                                </div>
                                <input
                                    type="range"
                                    class="slider-input"
                                    min="12"
                                    max="32"
                                    step="1"
                                    .value=${this.fontSize}
                                    @input=${this.handleFontSizeChange}
                                />
                                <div class="slider-labels">
                                    <span>12px</span>
                                    <span>32px</span>
                                </div>
                                <div class="form-description">
                                    ${this.Layout_AdjustFont}
                                </div>
                            </div>
                        </div>
                    </div>
        `;
    }//end _interface_layout

    _screen_capture(){
        return html`
        <div class="section-title">
                        <span>${this.Screen_Capture}</span>
                    </div>

                    <div class="form-grid">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">
                                    ${this.Screen_Capture_Interval}
                                    <span class="current-selection"
                                        >${this.selectedScreenshotInterval === 'manual' ? 'Manual' : this.selectedScreenshotInterval + 's'}</span
                                    >
                                </label>
                                <select class="form-control" .value=${this.selectedScreenshotInterval} @change=${this.handleScreenshotIntervalSelect}>
                                    <option value="manual" ?selected=${this.selectedScreenshotInterval === 'manual'}>${this.Screen_Manual}</option>
                                    <option value="1" ?selected=${this.selectedScreenshotInterval === '1'}>${this.Screen_1}</option>
                                    <option value="2" ?selected=${this.selectedScreenshotInterval === '2'}>${this.Screen_2}</option>
                                    <option value="5" ?selected=${this.selectedScreenshotInterval === '5'}>${this.Screen_5}</option>
                                    <option value="10" ?selected=${this.selectedScreenshotInterval === '10'}>${this.Screen_10}</option>
                                </select>
                                <div class="form-description">
                                    ${
                                        this.selectedScreenshotInterval === 'manual'
                                            ? `${this.Screen_Screenshots}`
                                            : `${this.Screen_Automatic}`
                                    }
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">
                                    ${this.Screen_Image}
                                    <span class="current-selection"
                                        >${this.selectedImageQuality.charAt(0).toUpperCase() + this.selectedImageQuality.slice(1)}</span
                                    >
                                </label>
                                <select class="form-control" .value=${this.selectedImageQuality} @change=${this.handleImageQualitySelect}>
                                    <option value="high" ?selected=${this.selectedImageQuality === 'high'}>${this.Screen_Image_High}</option>
                                    <option value="medium" ?selected=${this.selectedImageQuality === 'medium'}>${this.Screen_Image_Medium}</option>
                                    <option value="low" ?selected=${this.selectedImageQuality === 'low'}>${this.Screen_Image_Low}</option>
                                </select>
                                <div class="form-description">
                                    ${
                                        this.selectedImageQuality === 'high'
                                            ? `${this.Screen_Image_High_quality}`
                                            : this.selectedImageQuality === 'medium'
                                              ? `${this.Screen_Image_Medium_quality}`
                                              : `${this.Screen_Image_Low_quality}`
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
        `;
    }//end _screen_capture

    _keyboard_shortcuts(){
            return html`
                    <div class="section-title">
                        <span>${this.Keyboard_Shortcuts}</span>
                    </div>

                    <table class="keybinds-table">
                        <thead>
                            <tr>
                                <th>${this.Keyboard_Action}</th>
                                <th>${this.Keyboard_Shortcut}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.getKeybindActions().map(
                                action => html`
                                    <tr>
                                        <td>
                                            <div class="action-name">${action.name}</div>
                                            <div class="action-description">${action.description}</div>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                class="form-control keybind-input"
                                                .value=${this.keybinds[action.key]}
                                                placeholder="Press keys..."
                                                data-action=${action.key}
                                                @keydown=${this.handleKeybindInput}
                                                @focus=${this.handleKeybindFocus}
                                                readonly
                                            />
                                        </td>
                                    </tr>
                                `
                            )}
                            <tr class="table-reset-row">
                                <td colspan="2">
                                    <button class="reset-keybinds-button" @click=${this.resetKeybinds}>${this.Keyboard_Reset}</button>
                                    <div class="form-description" style="margin-top: 8px;">
                                        ${this.Keyboard_Restore}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
            `;
        }

        _google_search(){
         return html`
            <div class="section-title">
                        <span>${this.Google_Search}</span>
                    </div>

                    <div class="form-grid">
                        <div class="checkbox-group">
                            <input
                                type="checkbox"
                                class="checkbox-input"
                                id="google-search-enabled"
                                .checked=${this.googleSearchEnabled}
                                @change=${this.handleGoogleSearchChange}
                            />
                            <label for="google-search-enabled" class="checkbox-label"> ${this.Google_Enable} </label>
                        </div>
                        <div class="form-description" style="margin-left: 24px; margin-top: -8px;">
                            ${this.Google_Allow}
                            <br /><strong>${this.Google_Note}</strong> ${this.Google_Changes}
                        </div>
                    </div>
         `;
        }


    _advanced_mode(){
         return html`
                    <div class="section-title" style="color: var(--danger-color, #ef4444);">
                        <span>${this.Advanced}</span>
                    </div>

                    <div class="form-grid">
                        <div class="checkbox-group">
                                <input
                                    type="checkbox"
                                    class="checkbox-input"
                                    id="advanced-mode"
                                    .checked=${this.advancedMode}
                                    @change=${this.handleAdvancedModeChange}
                                />
                                <label for="advanced-mode" class="checkbox-label"> ${this.Advanced_Enable} </label>
                            </div>
                            <div class="form-description" style="margin-left: 24px; margin-top: -8px;">
                                ${this.Advanced_Unlock}
                                <br /><strong>${this.Google_Note}</strong> ${this.Advanced_Advanced_mode}
                            </div>
                        </div>
                    </div>
         `;
    }


    render() {
        return html`
            <div class="settings-container">
                <div class="settings-container">
                    ${this._Profile()}    
                </div>
                <!-- Language Application - Oscardo -->
                <div class="settings-section">
                    ${this._language_application()}
                </div>                    
                <!-- Language Application - Oscardo -->

                <!-- Language & Audio Section -->
                <div class="settings-section">
                    ${this._language()}
                </div>

                <!-- Interface Layout Section -->
                <div class="settings-section">
                    ${this._interface_layout()}
                </div>

                <!-- Screen Capture Section -->
                <div class="settings-section">
                    ${this._screen_capture()}
                </div>

                <!-- Keyboard Shortcuts Section -->
                <div class="settings-section">
                    ${this._keyboard_shortcuts()}
                </div>

                <!-- Google Search Section -->
                <div class="settings-section">
                    ${this._google_search()}
                </div>
                <div class="settings-note">
                    ${this.Message_Impotant}
                </div>
                <!-- Advanced Mode Section (Danger Zone) -->
                <div class="settings-section" style="border-color: var(--danger-border, rgba(239, 68, 68, 0.3)); background: var(--danger-background, rgba(239, 68, 68, 0.05));">
                    ${this._advanced_mode()}
                </div>
            </div>
        `;
    }//end the render
}//end export class CustomizerView

customElements.define('customize-view', CustomizeView);