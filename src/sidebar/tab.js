class ContainerTab {
    constructor(tab, element) {
        this.tab = tab
        this.id = tab.id
        this.element = element
    }

    init() {
        this._createElements()
        this.render()
        browser.tabs.onUpdated.addListener((id, state, tab) => {
            this.tab = tab
            this.render()
        }, {
            tabId: this.id,
            properties: ["title", "favIconUrl"]
        })
    }

    destroy() {
        //browser.tabs.onUpdated.removeListener(this.listeners.update)
    }

    _createElements() {
        this.elements = {}
        this.elements.close = document.createElement('span')
        this.elements.close.className = 'container-tab-close'
        this.elements.close.innerText = '✕'
        this.element.appendChild(this.elements.close)
        this.elements.close.addEventListener('click', (e) => {
            e.stopPropagation()
            browser.tabs.remove(this.id)
        })

        this.elements.favicon = document.createElement('img')
        this.elements.favicon.className = 'favicon'
        this.element.appendChild(this.elements.favicon)

        this.elements.title = document.createElement('span')
        this.elements.title.className = 'container-tab-title'
        this.element.appendChild(this.elements.title)

        this.element.addEventListener("click", () => {
            browser.tabs.update(this.id, {
                active: true
            })
        })
    }

    activate() {
        this.tab.active = true
        this.render()
    }

    render() {
        let faviconUrl = this.tab.favIconUrl
        if(!faviconUrl) {
            faviconUrl = "../assets/no-favicon.svg"
        }
        this.elements.favicon.src = faviconUrl
        this.elements.title.innerText = this.tab.title
        if(this.tab.active) {
            this.element.classList.add('tab-active')
        }
    }
}