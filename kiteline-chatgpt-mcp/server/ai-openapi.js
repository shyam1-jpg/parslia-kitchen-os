'use strict';

/**
 * OpenAPI 3.1 schema for ChatGPT GPT Actions / other AI assistants.
 * Kiteline is a multipurpose hospitality platform — company-scoped only.
 */
function buildOpenApi(baseUrl) {
  const origin = (baseUrl || 'https://kiteline.uk').replace(/\/$/, '');

  const siteParam = {
    name: 'site',
    in: 'query',
    schema: { type: 'string' },
    description: 'Site / kitchen id within the logged-in company workspace',
  };
  const qParam = {
    name: 'q',
    in: 'query',
    schema: { type: 'string' },
    description: 'Search text (name, category, tags, SKU, etc.)',
  };
  const dietParam = {
    name: 'diet',
    in: 'query',
    schema: { type: 'string' },
    description:
      'Optional filter using a diet tag enabled for THIS company '
      + '(e.g. vegetarian, vegan, jain, ekadashi, halal, kosher, gluten-free). '
      + 'Ignored unless the company has configured that rule.',
  };

  const bearer = { security: [{ AiBearer: [] }, { AiApiKey: [] }, { OAuth2: [] }] };
  const writeBody = {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            confirm: {
              type: 'boolean',
              description: 'Must be true for create/update/delete after user approval',
            },
            site: { type: 'string' },
            data: { type: 'object' },
            publish: { type: 'boolean', description: 'Menus only — publish when true' },
          },
        },
      },
    },
  };
  const ok = {
    200: { description: 'OK — data for the authenticated company only' },
    401: { description: 'Invalid or missing AI token / OAuth session' },
    403: { description: 'Permission denied or site not allowed' },
    409: { description: 'Confirmation required' },
  };

  function getOp(operationId, summary, description, extraParams) {
    return {
      operationId,
      summary,
      description,
      ...bearer,
      parameters: [siteParam].concat(extraParams || []),
      responses: ok,
    };
  }

  function postOp(operationId, summary, description) {
    return {
      operationId,
      summary,
      description,
      ...bearer,
      requestBody: writeBody,
      responses: Object.assign({}, ok, { 201: { description: 'Created' } }),
    };
  }

  const paths = {
    '/api/ai/health': {
      get: {
        operationId: 'get_health',
        summary: 'Health check',
        description: 'Public health check for the Kiteline AI connector.',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/ai/me': {
      get: getOp(
        'get_me',
        'Current company workspace',
        'Returns the authenticated company, role, sites and token permissions. Never returns other companies.'
      ),
    },
    '/api/ai/business': {
      get: getOp(
        'get_business',
        'Business settings',
        'Company profile, business type, sites and configurable dietary rules for this workspace only.'
      ),
      put: {
        operationId: 'put_business',
        summary: 'Update business / dietary settings',
        description:
          'Update company settings including which dietary rules are enabled for THIS business. '
          + 'Dietary rules are never applied globally across Kiteline customers.',
        ...bearer,
        requestBody: writeBody,
        responses: ok,
      },
    },
    '/api/ai/sites': {
      get: getOp('get_sites', 'List sites', 'Sites / kitchens the AI token may access within this company.'),
    },
    '/api/ai/recipes': {
      get: getOp(
        'search_recipes',
        'Search recipes, products and dishes',
        'Search and list recipes/dishes for the company. Supports q and optional diet filters.',
        [qParam, dietParam]
      ),
      post: postOp('create_recipe', 'Create draft recipe', 'Creates a draft recipe in this company workspace.'),
    },
    '/api/ai/menus': {
      get: getOp('get_menus', 'List / search menus', 'Menus for the company site.', [qParam]),
      post: postOp('create_menu', 'Create or publish menu', 'Create a menu draft or publish (requires permission).'),
    },
    '/api/ai/allergens': {
      get: getOp(
        'get_allergen_report',
        'Allergen report',
        'Statutory allergens and dish allergen declarations for this company.'
      ),
    },
    '/api/ai/nutrition': {
      get: getOp(
        'get_nutrition_report',
        'Nutrition report',
        'Nutrition summary for recipes/dishes (stored values and/or ingredient estimates).',
        [qParam]
      ),
    },
    '/api/ai/temperature-logs': {
      get: getOp('get_temperature_logs', 'Read temperature records', 'Fridge/freezer sensors and temperature records.'),
      post: postOp('add_temperature_log', 'Add temperature record', 'Add a temperature log entry (confirm required).'),
    },
    '/api/ai/haccp-logs': {
      get: getOp('get_haccp_logs', 'HACCP / compliance logs', 'HACCP plans, checks and related records.'),
      post: postOp('add_haccp_log', 'Add HACCP / compliance entry', 'Add a compliance check entry.'),
    },
    '/api/ai/cleaning-checks': {
      get: getOp('get_cleaning_checks', 'Cleaning checks', 'Hygiene and cleaning checklists.'),
    },
    '/api/ai/fridge-freezer-units': {
      get: getOp('get_fridge_freezer_units', 'Fridge / freezer units', 'Registered temperature units at the site.'),
    },
    '/api/ai/labels': {
      get: getOp('get_labels', 'Food labels', 'Label records for the company.'),
      post: postOp('create_label', 'Create label', 'Create a food label record.'),
    },
    '/api/ai/stock': {
      get: getOp('search_stock', 'Search stock', 'Batches and assets / stock items.', [qParam]),
    },
    '/api/ai/suppliers': {
      get: getOp('search_suppliers', 'Search suppliers', 'Approved suppliers for the company.', [qParam]),
    },
    '/api/ai/orders': {
      get: getOp('get_orders', 'Orders / deliveries', 'Delivery and order records.', [qParam]),
    },
    '/api/ai/shopping-list': {
      get: getOp(
        'generate_shopping_list',
        'Generate shopping / ordering list',
        'Aggregates ingredients from selected menus/recipes and highlights gaps vs current stock.',
        [
          qParam,
          {
            name: 'menuId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Optional menu id to build the list from',
          },
          {
            name: 'recipeIds',
            in: 'query',
            schema: { type: 'string' },
            description: 'Comma-separated recipe ids',
          },
        ]
      ),
      post: postOp(
        'create_shopping_list',
        'Save shopping / ordering list',
        'Persist a generated shopping/ordering list for the company (confirm required).'
      ),
    },
    '/api/ai/waste': {
      get: getOp('get_waste', 'Waste records', 'Waste log entries for cost and compliance.'),
    },
    '/api/ai/rota': {
      get: getOp(
        'search_rota',
        'Staff rota and operational records',
        'Team members, rota/shift workflows and related operational records.',
        [qParam]
      ),
    },
    '/api/ai/reports': {
      get: getOp(
        'get_business_reports',
        'Business, cost and compliance reports',
        'Summary and exportable report covering temps, HACCP, waste, recipes, menus and cost signals.',
        [{
          name: 'type',
          in: 'query',
          schema: { type: 'string', enum: ['summary', 'compliance', 'cost', 'full'] },
          description: 'Report flavour (default summary/full based on token permissions)',
        }]
      ),
    },
  };

  return {
    openapi: '3.1.0',
    info: {
      title: 'Kiteline — ChatGPT / AI Connector',
      version: '1.1.0',
      description: [
        'Secure company-scoped API for Kiteline, a multipurpose business and hospitality-management platform.',
        'Works for hotels, restaurants, catering, commercial kitchens, schools, care homes, retreat centres, cafés, bakeries, event venues and other food businesses.',
        'Each AI token or OAuth grant is bound to one company workspace — ChatGPT only sees that company’s data.',
        'Dietary rules (vegetarian, vegan, Jain, Ekadashi, halal, kosher, gluten-free, etc.) are configurable per business and are never forced on every Kiteline customer.',
        'Create tokens in the Kiteline app (Settings → Connect ChatGPT) or use OAuth. Never send user passwords.',
      ].join(' '),
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
                'kiteline.read': 'Read company recipes, stock, logs and reports',
                'kiteline.write': 'Create and update company records (with user confirmation)',
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
