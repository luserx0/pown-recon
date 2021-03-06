const querystring = require('querystring')
const { Scheduler } = require('@pown/request/lib/scheduler')

const { Transformer } = require('../../transformer')

const crtshDomainReport = class extends Transformer {
    static get alias() {
        return ['crtsh_domain_report', 'crtshdr']
    }

    static get title() {
        return 'CRT.SH Domain Report'
    }

    static get description() {
        return 'Obtain crt.sh domain report which helps enumerating potential target subdomains.'
    }

    static get types() {
        return ['*']
    }

    static get options() {
        return {}
    }

    constructor() {
        super()

        this.scheduler = new Scheduler()

        this.headers = {
            'user-agent': 'Pown'
        }
    }

    async run(items, options) {
        const results = await Promise.all(items.map(async({ id: target = '', label = '' }) => {
            const query = querystring.stringify({
                dNSName: `%.${label}`
            })

            const { responseBody } = await this.scheduler.fetch(`https://crt.sh/?${query}`, this.headers)

            const text = responseBody.toString()
            const expr = new RegExp(/<TD>(?:\*\.)?([^\s]+?)\.?<\/TD>/g)

            const domains = []

            let match = expr.exec(text)

            while (match) {
                domains.push(match[1].toLowerCase().replace(/^\.+|\.+$/g, '').trim())

                match = expr.exec(text)
            }

            const results = []

            Array.from(new Set(domains)).forEach((domain) => {
                domain = domain.trim().toLocaleLowerCase()

                if (!domain) {
                    return
                }

                results.push({ id: domain, type: 'domain', label: domain, props: { domain }, edges: [target] })
            })

            return results
        }))

        return this.flatten(results, 2)
    }
}

module.exports = { crtshDomainReport }
