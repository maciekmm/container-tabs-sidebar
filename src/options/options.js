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
            CTSOptions.getSidebarAction().then(action => {
                action.shortcut = settings['shortcut']
                return browser.commands.update(action)
            })
        })
    })

    CTSOptions.getConfig().then(c => {
        for (let option of options) {
            if (option.type.toLowerCase() == 'checkbox') {
                option.checked = c[option.name]
            } else {
                option.value = c[option.name]
            }
        }
    })
}