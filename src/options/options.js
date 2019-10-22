import {
    getSidebarAction,
    getConfig
} from '../settings.js'

{
    const options = document.querySelectorAll('[name]')
    const form = document.querySelector('form')
    form.addEventListener('submit', e => {
        e.preventDefault()
        let settings = {}
        for (let option of options) {
            if (option.type.toLowerCase() == 'checkbox') {
                settings[option.name] = option.checked
            } else {
                settings[option.name] = option.value
            }
        }
        browser.storage.local.set(settings).then(e => {
            if(typeof browser.commands.update != 'function') {
                return
            }
            getSidebarAction().then(action => {
                action.shortcut = settings['shortcut']
                return browser.commands.update(action)
            })
        })
    })

    getConfig().then(c => {
        for (let option of options) {
            if (option.type.toLowerCase() == 'checkbox') {
                option.checked = c[option.name]
            } else {
                option.value = c[option.name]
            }
        }
    })

    // internalization
    document.querySelectorAll("[data-i18n]").forEach(el => {
        let key = el.getAttribute("data-i18n")
        let message = browser.i18n.getMessage(key)
        if(!message) {
            console.warn("no translation key " + key + " found")
        } else {
            let attribute = el.hasAttribute("data-i18n-attr") ? el.getAttribute("data-i18n-attr") : "innerText"
            el[attribute] = message
        }
    })
}