const schemaString = {
	"fields": [
	{
		"name": "data",
		"type": "record",
		"fields": [{
			"name": "amazonOrderId",
			"type": "STRING"
		},
		{
			"name": "sellerOrderId",
			"type": "STRING"
		},
		{
			"name": "purchaseDate",
			"type": "TIMESTAMP"
		},
		{
			"name": "lastUpdateDate",
			"type": "TIMESTAMP"
		},
		{
			"name": "orderStatus",
			"type": "STRING"
		},
		{
			"name": "fulfillmentChannel",
			"type": "STRING"
		},
		{
			"name": "salesChannel",
			"type": "STRING"
		},
		{
			"name": "shipServiceLevel",
			"type": "STRING"
		},
		{
			"name": "orderTotal",
			"type": "record",
			"fields": [{
				"name": "currencyCode",
				"type": "STRING"
			},
			{
				"name": "amount",
				"type": "STRING"
			}
			]
		},
		{
			"name": "numberOfItemsShipped",
			"type": "INTEGER"
		},
		{
			"name": "numberOfItemsUnshipped",
			"type": "INTEGER"
		},
		{
			"name": "paymentMethod",
			"type": "STRING"
		},
		{
			"name": "paymentMethodDetails",
			"type": "STRING",
			"mode": "repeated"
		},
		{
			"name": "marketplaceId",
			"type": "STRING"
		},
		{
			"name": "shipmentServiceLevelCategory",
			"type": "STRING"
		},
		{
			"name": "orderType",
			"type": "STRING"
		},
		{
			"name": "earliestShipDate",
			"type": "TIMESTAMP"
		},
		{
			"name": "latestShipDate",
			"type": "TIMESTAMP"
		},
		{
			"name": "isBusinessOrder",
			"type": "BOOLEAN"
		},
		{
			"name": "isPrime",
			"type": "BOOLEAN"
		},
		{
			"name": "isPremiumOrder",
			"type": "BOOLEAN"
		},
		{
			"name": "isGlobalExpressEnabled",
			"type": "BOOLEAN"
		},
		{
			"name": "isReplacementOrder",
			"type": "BOOLEAN"
		},
		{
			"name": "isSoldByAB",
			"type": "BOOLEAN"
		},
		{
			"name": "isISPU",
			"type": "BOOLEAN"
		},
		{
			"name": "isAccessPointOrder",
			"type": "BOOLEAN"
		},
		{
			"name": "shippingAddress",
			"type": "record",
			"fields": [{
				"name": "city",
				"type": "STRING"
			},
			{
				"name": "stateOrRegion",
				"type": "STRING"
			},
			{
				"name": "postalCode",
				"type": "STRING"
			},
			{
				"name": "countryCode",
				"type": "STRING"
			}
			]
		},
		{
			"name": "buyerInfo",
			"type": "record",
			"fields": [{
				"name": "buyerEmail",
				"type": "STRING"
			}]
		},
		{
			"name": "hasRegulatedItems",
			"type": "BOOLEAN"
		}
		]
	}
	]
};

var table_name = "amazon_orders"
var schema = "raw"
var uri = "gs://<BUCKET_NAME>/AMAZON/ORDERS/"

operate(table_name)
	.tags(['amazon'])
	.schema(schema)
	.hasOutput(true)
	.queries(
		(ctx) => `
       LOAD DATA INTO ${ctx.resolve(schema, table_name)} 
			(\n${macros.formatJsonSchema(schemaString)}\n)
       OVERWRITE PARTITIONS (dt='${macros.getCurrentDate()}')
       PARTITION BY dt 
	   OPTIONS (description = 'Amazon Orders via https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference#order')
       FROM FILES (
			format = 'JSON',
        	hive_partition_uri_prefix = '${uri}',
        	uris = ['${uri}dt=${macros.getCurrentDate()}*.data'],
			ignore_unknown_values = TRUE 
		)
       WITH PARTITION COLUMNS(dt DATE)`
	);