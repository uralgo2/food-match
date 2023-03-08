export class Localisation {
    private m_languages: Set<string>
    private m_locals: {
        [lang: string]: {[key: string]: string}
    } = {}
    private m_default: string
    private m_currentLanguage: string
    constructor(_default: string) {
        this.m_languages = new Set<string>()
        this.m_currentLanguage = this.m_default = _default
    }

    public SetDefault(_default: string){
        if(this.m_languages.has(_default))
            this.m_default = _default
        else throw new Error("The default language is not registered!")
    }

    public GetLocal(key: string){
        return this.m_locals[this.m_currentLanguage][key] ??
                this.m_locals[this.m_default][key]
    }

    public AddLanguage(lang: string, locals: string|any){
        const locs = typeof locals === 'string'
                    ? JSON.parse(locals) as {[key: string]: string}
                    : locals
        this.m_languages.add(lang)
        this.m_locals[lang] = locs
    }

    public SetCurrentLanguage(lang: string){
        if(this.m_languages.has(lang))
            this.m_currentLanguage = lang
        else throw new Error("Language is not registered!")
    }
}