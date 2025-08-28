const _ = require('lodash')
const nodeenv = process.env.NODE_ENV

const config = {
  default: {
    elasticsearch_url: 'https://luxury-select-stage.es.us-east-1.aws.found.io/',
    paragon_token: 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOjEsImNsYXNzaWZ5IjoiQ0UyIiwiY25vIjoxLCJoYXNSb2xlIjoiWSIsInR5cGUiOiJDQ0UiLCJleHAiOjIxNzExNTA3NDQsImlhdCI6MTU0MDQzMDc0NCwiYXV0aG9yaXRpZXMiOlt7ImF1dGhvcml0eSI6IlkifV19.wuqhQuiByQHWy6cCLRFmN9d5ECCZdzVA6lFcXT4k5f_a23WA9x4NPw3JMN9-ac7BFx_ohVssXIdARF0rRcrwWg',
    select_admin_url: 'https://dev-select-admin.vercel.app/',
    image_host: 'SOME_PATH',
  },

  prod: {
    elasticsearch_url: 'https://luxury-select.es.us-east-1.aws.found.io/',
    paragon_token: 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOjEsImNsYXNzaWZ5IjoiQ0UyIiwiY25vIjoxLCJoYXNSb2xlIjoiWSIsInR5cGUiOiJDQ0UiLCJleHAiOjIxNzExNTA3NDQsImlhdCI6MTU0MDQzMDc0NCwiYXV0aG9yaXRpZXMiOlt7ImF1dGhvcml0eSI6IlkifV19.wuqhQuiByQHWy6cCLRFmN9d5ECCZdzVA6lFcXT4k5f_a23WA9x4NPw3JMN9-ac7BFx_ohVssXIdARF0rRcrwWg',
    select_admin_url: 'https://dev-select-admin.vercel.app/',
    image_host: 'SOME_PATH',

    big_query: {
      project_id: 'keyword-data-373606',
      dataset_id: 'out_allstay',
    },
  },
}

module.exports = _.assign(config.default, config[nodeenv]);
