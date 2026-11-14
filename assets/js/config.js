window.APP_CONFIG = {
  COMPANY_NAME: 'NumberToInfo',
  DEMO_MODE: false,
  API_BASE: 'https://main-req-api.onrender.com',
  API_KEY: '',            // optional: sent as "X-API-Key" header if not empty

  ENDPOINTS: {
    id:     '/info',     // GET ?q=<value>  -> any JSON object / array
    vid:    '/vinfo',
    family: '/finfo',
    aadhar: '/ainfo'
  },
  SEARCH_METHOD: 'GET',   // 'GET' sends ?q=value, 'POST' sends {"q": value}
  SEARCH_PARAM: 'num',

  KINDS: {
    id:     { title: 'Number Info', label: 'Phone Number', placeholder: 'Ex. 9989416532',
              desc: 'Look up the record linked to an Phone Number', page: 'id-info.html' },
    vid:    { title: 'Vehicle', label: 'Vehicle Number', placeholder: 'Ex. MP36MF9018',
              desc: 'Look up the linked Phone Number from Vehicle', page: 'vid-info.html' },
    family: { title: 'Family Info', label: 'Aadhar Number', placeholder: 'Ex. 250636272771',
              desc: 'View the family members linked to a record.', page: 'family-info.html' },
    aadhar: { title: 'Aadhar Info', label: 'Aadhar Number', placeholder: 'Ex. 250636272771',
              desc: 'View the Aadhar Card linked to a record.', page: 'adhar-info.html' }
  }
};
