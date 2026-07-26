'use strict';

function buildOpenApi(baseUrl) {
  const origin = (baseUrl || 'https://kiteline.uk').replace(/\/$/, '');
  const paths = {};
  const resources = [
    ['health', 'get', false, 'Connector health check'],
    ['me', 'get', true, 'Current company workspace for this AI token'],
    ['workspace', 'get', true, 'Company settings and dietary configuration'],
    ['workspace', 'patch', true, 'Update company settings / dietary rules (Admin)'],
    ['sites', 'get', true, 'Kitchens / sites for this company'],
    ['search_recipes', 'get', true, 'MCP: search recipes / dishes in this company'],
    ['create_menu', 'post', true, 'MCP: create menu from all saved dishes (confirm required)'],
    ['get_menus', 'get', true, 'MCP: list menus and dishes'],
    ['get_missing_temperature_logs', 'get', true, 'MCP: missing temperature logs today'],
    ['add_temperature_log', 'post', true, 'MCP: add temperature log (confirm required)'],
    ['generate_allergen_report', 'post', true, 'MCP: allergen report export (confirm required)'],
    ['generate_shopping_list', 'post', true, 'MCP: shopping list export (confirm required)'],
    ['search', 'get', true, 'Search recipes, dishes, menus, stock and suppliers'],
    ['recipes', 'get', true, 'Search recipes, products and dishes (?q=)'],
    ['recipes', 'post', true, 'Create a draft recipe'],
    ['menus', 'get', true, 'List or search menus'],
    ['menus', 'post', true, 'Create or publish a menu from all account dishes'],
    ['allergens', 'get', true, 'Allergen report for dishes'],
    ['nutrition', 'get', true, 'Nutrition report for dishes'],
    ['temperature-logs', 'get', true, 'Read temperature records'],
    ['temperature-logs', 'post', true, 'Add a temperature record'],
    ['haccp-logs', 'get', true, 'Read HACCP / compliance records'],
    ['haccp-logs', 'post', true, 'Add a HACCP / compliance record'],
    ['cleaning-checks', 'get', true, 'Cleaning / hygiene checks'],
    ['fridge-freezer-units', 'get', true, 'Fridge and freezer units'],
    ['labels', 'get', true, 'Food labels'],
    ['labels', 'post', true, 'Create a food label'],
    ['stock', 'get', true, 'Search stock batches and assets (?q=)'],
    ['suppliers', 'get', true, 'Search suppliers (?q=)'],
    ['shopping-list', 'get', true, 'Generate shopping / ordering list (confirm required)'],
    ['shopping-list', 'post', true, 'Generate shopping list from menus or recipes (confirm required)'],
    ['orders', 'get', true, 'Supplier deliveries / orders'],
    ['waste', 'get', true, 'Waste records'],
    ['rota', 'get', true, 'Staff rota and operational records'],
    ['reports', 'get', true, 'Business, cost and compliance reports (export needs confirm)'],
  ];

  resources.forEach(([name, method, auth, summary]) => {
    const p = `/api/ai/${name}`;
    paths[p] = paths[p] || {};
    const params = [];
    if ((method === 'get' || method === 'patch') && name !== 'health') {
      params.push({
        name: 'site',
        in: 'query',
        schema: { type: 'string' },
        description: 'Kitchen site id for this company (e.g. site_grove)',
      });
    }
    if (method === 'get' && ['search', 'recipes', 'menus', 'stock', 'suppliers', 'search_recipes', 'get_menus'].includes(name)) {
      params.push({
        name: 'q',
        in: 'query',
        schema: { type: 'string' },
        description: 'Search query',
      });
    }
    if (method === 'get' && name === 'shopping-list') {
      params.push(
        { name: 'menuId', in: 'query', schema: { type: 'string' }, description: 'Build list from a menu' },
        { name: 'recipeId', in: 'query', schema: { type: 'string' }, description: 'Build list from a recipe' },
        { name: 'fromMenus', in: 'query', schema: { type: 'boolean' }, description: 'Include ingredients from site menus' },
      );
    }
    const op = {
      operationId: `${method}_${name.replace(/-/g, '_')}`,
      summary: summary || `${method.toUpperCase()} ${name}`,
      description:
        name === 'health'
          ? 'Public health check for the Kiteline AI connector (no auth).'
          : (
            'Tenant-scoped: only data for the company that owns this AI token. '
            + 'Dietary rules (vegetarian, vegan, Jain, Ekadashi, halal, kosher, gluten-free, etc.) '
            + 'are configured per company via /api/ai/workspace — never forced on all Kiteline customers.'
          ),
      responses: name === 'health'
        ? { 200: { description: 'OK' } }
        : {
          200: { description: 'OK' },
          401: { description: 'Invalid or missing AI token' },
          403: { description: 'Permission denied or site not allowed' },
          409: { description: 'Confirmation required' },
        },
    };
    if (auth) op.security = [{ AiBearer: [] }, { AiApiKey: [] }, { OAuth2: [] }];
    if (params.length) op.parameters = params;
    if (method !== 'get') {
      op.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                confirm: { type: 'boolean', description: 'Must be true for create/update/delete' },
                site: { type: 'string' },
                data: { type: 'object' },
                dietary: {
                  type: 'object',
                  description: 'Per-company dietary profiles (workspace update only)',
                  properties: {
                    enabled: { type: 'array', items: { type: 'string' } },
                    defaultProfile: { type: 'string' },
                    notes: { type: 'string' },
                  },
                },
                businessType: {
                  type: 'string',
                  description: 'hotel | restaurant | catering | commercial_kitchen | school | college | care_home | retreat_centre | cafe | bakery | event_venue | other_hospitality',
                },
              },
            },
          },
        },
      };
      op['x-openai-isConsequential'] = true;
    }
    paths[p][method] = op;
  });

  return {
    openapi: '3.0.1',
    info: {
      title: 'Kiteline AI Connector (ChatGPT / MCP)',
      version: '1.2.2',
      description:
        'Secure Kiteline API for authorised AI assistants (ChatGPT Custom GPT Actions + MCP at https://kiteline.uk/mcp). '
        + 'Kiteline is a multipurpose business and hospitality-management platform for hotels, restaurants, '
        + 'catering companies, commercial kitchens, schools, colleges, care homes, retreat centres, cafés, '
        + 'bakeries, event venues and other food businesses. '
        + 'Each company has its own secure workspace — tokens never cross companies. '
        + 'MCP tools: search_recipes, create_menu, get_menus, get_missing_temperature_logs, '
        + 'add_temperature_log, generate_allergen_report, generate_shopping_list. '
        + 'Use a Kiteline AI token — never a user password. Create tokens: Settings → Connect ChatGPT. '
        + 'GPT logo: ' + origin + '/chatgpt-gpt-logo.png',
      contact: { name: 'Kiteline', email: 'contact@kiteline.uk', url: origin },
      termsOfService: `${origin}/terms.html`,
      'x-logo': {
        url: `${origin}/chatgpt-gpt-logo.png`,
        backgroundColor: '#0f172a',
        altText: 'Kiteline',
      },
    },
    externalDocs: {
      description: 'Privacy policy (required for ChatGPT Actions)',
      url: `${origin}/privacy.html`,
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: {
        AiBearer: {
          type: 'http',
          scheme: 'bearer',
          description: 'Kiteline AI token (kl_ai_…)',
        },
        AiApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Kiteline AI token (kl_ai_…)',
        },
        OAuth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: `${origin}/api/ai/oauth/authorize`,
              tokenUrl: `${origin}/api/ai/oauth/token`,
              scopes: {
                'kiteline.read': 'Read recipes, stock, allergens, logs, and reports for your company only',
                'kiteline.write': 'Create and update records for your company (with user confirmation)',
              },
            },
          },
        },
      },
    },
    paths,
  };
}

module.exports = { buildOpenApi };
