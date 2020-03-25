export function serializeTypes(serializer: any) {

    serializer.register('organization', 'id-only', {
        id: "id"
    })
    serializer.register('servicechain', 'id-only', {
        id: "id"
    })
    serializer.register('category', 'id-only', {
        id: "id"
    })
    serializer.register('contact', 'id-only', {
        id: "id"
    })
    serializer.register('message', 'id-only', {
        id: "id"
    })
    serializer.register('service', 'id-only', {
        id: "id"
    })
    serializer.register('user', 'id-only', {
        id: "id"
    })

    serializer.register('category', {
        whitelist: ['id', 'name'],
        links: {
            self: data => { return `/orgs/${data.organization}/categories/${data.id}` }
        },
        relationships: {
            organization: {
                type: 'organization',
                links: data => { return { related: `/orgs/${data.organization}` } },
                schema: 'id-only'
            }
        }
    })

    serializer.register('contact', {
        whitelist: ['id', 'title', 'first_name', 'surname', 'email_address', 'phone_number'],
        links: {
            self: data => { return `/orgs/${data.organization}/contacts/${data.id}` }
        },
        relationships: {
            organization: {
                type: 'organization',
                links: data => { return { related: `/orgs/${data.organization}` } },
                schema: 'id-only'
            },
            servicechain: {
                type: 'servicechain',
                links: data => { return { related: `/orgs/${data.organization}/servicechains/${data.servicechain}` } },
                schema: 'id-only'
            },
            category: {
                type: 'category',
                links: data => { return { related: `/orgs/${data.organization}/categories/${data.category}` } },
                schema: 'id-only'
            }
        }
    })

    serializer.register('service', {
        whitelist: ['id', 'name', 'directory_name'],
        links: {
            self: data => { return `/services/${data.id}` }
        }
    })

    serializer.register('message', {
        whitelist: ['id', 'body', 'direction', 'message_state'],
        links: {
            self: data => { return `/orgs/${data.organization}/messages/${data.id}` }
        },
        relationships: {
            organization: {
                type: 'organization',
                links: data => { return { related: `/orgs/${data.organization}` } },
                schema: 'id-only'
            },
            servicechain: {
                type: 'servicechain',
                links: data => { return { related: `/orgs/${data.organization}/servicechains/${data.servicechain}` } },
                schema: 'id-only'
            },
            category: {
                type: 'contact',
                links: data => { return { related: `/orgs/${data.organization}/contacts/${data.contact}` } },
                schema: 'id-only'
            },
            user: {
                type: 'user',
                links: data => { return { related: `/orgs/${data.organization}/users/${data.user}` } },
                schema: 'id-only'
            }
        }
    })

    serializer.register('organization', {
        whitelist: ['id', 'name', 'phone_number'],
        links: {
            self: data => { return `/orgs/${data.organization}` }
        }
    })

    serializer.register('servicechain', {
        whitelist: ['id', 'name', 'services'],
        links: {
            self: data => { return `/orgs/${data.organization}/servicechains/${data.id}` }
        },
        relationships: {
            organization: {
                type: 'organization',
                links: data => { return { related: `/orgs/${data.organization}` } },
                schema: 'id-only'
            }
        }
    })

    serializer.register('user', {
        whitelist: ['id', 'name'],
        links: {
            self: data => { return `/orgs/${data.organization}/users/${data.id}` }
        },
        relationships: {
            organization: {
                type: 'organization',
                links: data => { return { related: `/orgs/${data.organization}` } },
                schema: 'id-only'
            }
        }
    })
}