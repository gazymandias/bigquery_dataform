const schemaString = require("./amazon_orders_schema.json");
const tableName = "amazon_orders"
const schema = "raw"
const uri = "gs://<BUCKET_NAME>/AMAZON/ORDERS/"
const forceFullDataLoad = dataform.projectConfig.vars.forceFullDataLoad;
const currentDate = forceFullDataLoad === 'true' ? '' : functions.getCurrentDate();
const yesterdayDate = functions.getCurrentDate(hoursOffset=-24);
const overrideLoadDate = dataform.projectConfig.vars.overrideLoadDate;
const loadDate = overrideLoadDate ? overrideLoadDate : currentDate;
const overwritePartitions = forceFullDataLoad === 'true' ? '' : `OVERWRITE PARTITIONS (dt = '${loadDate}')`;
const overwriteOrInto = forceFullDataLoad === 'true' ? 'OVERWRITE' : 'INTO';




operate(tableName+'_speed')
	.tags(['amazon'])              
	.schema(schema)
	.hasOutput(true)
	.queries(
		(ctx) => `
  		BEGIN
		CREATE OR REPLACE EXTERNAL TABLE
			${ctx.resolve(schema, tableName + '_speed')}
		WITH PARTITION COLUMNS ( dt DATE) OPTIONS ( 
  			format = 'JSON',
  		    	hive_partition_uri_prefix = '${uri}',
			uris = ['${uri}dt=${loadDate}*.data'],
			ignore_unknown_values = TRUE,
		  	require_hive_partition_filter = FALSE
		);

		EXCEPTION WHEN ERROR THEN
		IF lower(@@error.message) like '%cannot query hive partitioned data for table%without any associated files%' THEN
		SELECT (@@error.message) as message;
		ELSE
		RAISE USING MESSAGE = (@@error.message);
		END IF;
		END;
    `);



operate(tableName+'_batch')
	.tags(['amazon'])              
	.schema(schema)
	.hasOutput(true)
	.queries(
		(ctx) => `
		BEGIN
		LOAD DATA ${overwriteOrInto} 
  			${ctx.resolve(schema, tableName + '_batch')}
		(
  			\n${functions.formatJsonSchema(schemaString)}\n
     		)
		${overwritePartitions}
		PARTITION BY dt 
		OPTIONS (description = 'Amazon Orders via https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference#order')
		FROM FILES ( 
  			format = 'JSON',
			hive_partition_uri_prefix = '${uri}',
			uris = ['${uri}dt=${yesterdayDate}*.data'],
			ignore_unknown_values = TRUE 
		)
		WITH PARTITION COLUMNS(dt DATE);

		EXCEPTION WHEN ERROR THEN
		IF lower(@@error.message) like '%cannot query hive partitioned data for table%without any associated files%' THEN
		SELECT (@@error.message) as message;
		ELSE
		RAISE USING MESSAGE = (@@error.message);
		END IF;
		END;
    `);


