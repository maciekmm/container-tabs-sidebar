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
})
