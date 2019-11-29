import * as request from 'request-promise-native'

export async function getAccessToken() {
    // Get an access_token from Auth0 on behalf of the Voluble Test Application
    let auth0_req_body = {
        audience: process.env.AUTH0_API_ID,
        grant_type: "client_credentials",
        client_id: process.env.AUTH0_TEST_CLIENT_ID,
        client_secret: process.env.AUTH0_TEST_CLIENT_SECRET
    }

    return request.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
        json: auth0_req_body
    }).then((body) => {
        if (!body.access_token) { throw new Error('No access token in Auth0 response') }
        return body.access_token
    })
}