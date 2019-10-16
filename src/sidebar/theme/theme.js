const DEFAULT_THEME = 'dark'

function injectCSS(file) {
    let link = document.createElement('link')
    link.href = file
    link.rel = 'stylesheet'
    document.head.appendChild(link)
}

CTSOptions.getConfig().then(config => {
    injectCSS('theme/' + config.theme + '.css')

    if(!!config['wrap_titles']) {
        document.body.classList.add('wrap-titles')
    }

    if(!!config['hide_empty']) {
        document.body.classList.add('hide-empty')
    }

    if(!!config['hide_empty_pinned']) {
        document.body.classList.add('hide-empty-pinned')
    }
}, err => {
    injectCSS(`theme/${DEFAULT_THEME}.css`)
})
