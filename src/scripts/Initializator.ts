import {Localisation} from "./Localisation"
import LocalisationLanguageRU from "./../localisations/lang.ru.json"
import LocalisationLanguageENG from "./../localisations/lang.eng.json"

export default function Init(){
    const localisation = new Localisation('ru')

    localisation.AddLanguage('ru', LocalisationLanguageRU)
    localisation.AddLanguage('eng', LocalisationLanguageENG) 
    return {
        localisation: localisation
    }
}