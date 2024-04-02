# bigquery_dataform

## Amazon Orders ELT

An **incredibly efficent** example of ELT in BigQuery using Dataform - the use case here involves the amazon API for Orders (https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference#order).


This repository assumes the returned json data from the API is being loaded into a Google Cloud Bucket with the hive structure to allow **selective loading of specific hive partition dates**.

*gs://BUCKET_NAME/amazon/orders/dt=**YYYY-MM-DD**/file_name.json*

Using **LOAD DATA INTO** ensures;

* All loading is completely **zero cost**.
* Loads are **signficantly faster** than using an equivalent external table, which would require a ready query over each file.
* Every run will find files for the current date and automatically **overwrite** any data that already exists for that partition, reducing the requirement to do complicated filters for only new files.


We also specify additional variables in our dataform.json;

* **forceFullDataLoad** - boolean flag detemining whether a run will perform a complete load of all available date partitions (this will automatically remove the overwrite partitions option since this is a full refresh).

* **overrideLoadDate** - a date value to allow a load for a specific date partition instead of running with the current date.

The table created (the example here is in the 'raw' schema) will be JSON. In this repository we create an additional **materialized view** 'ephemeral' layer on top of this to unnest and flatten the raw JSON, and finally our 'base' view sits on top of this and handles deduplication (which cannot as of time of writing be done in a materialized view).

The process here is therefore;

1. Each run loads data from .json blobs into a JSON BigQuery table.
2. A materialized view unnests and flattens this data; the cost here will be recomputation of new rows loaded via the previous step.
3. The base view can be queried at any point in time to provide flattened, deduplicated data. 


## Replication of the **dbt** 'seed' function in **Dataform**

The idea here was to attempt to replicate the functionality inbuilt to dbt for creating tables from csv files - this allows creations of seeds (which do not exist as of writing) in Dataform in seconds!

1. save the csv data in a file under seeds/ - this must be in the format below inside a js constant wrapper unfortunately;

#### **`seeds/example.csv`**
``` js 
const seed = `
    name,colour,age
    matthew,red,1
    mark,yellow,3
    luke,blue,4
    john,white,7
`;

module.exports = seed.trim();
```

2. Add a new entry to the seedNames array; this is an object containing the name (required), description and headers (optional). 

This will automatically create the new seed table based on the data provided using the **getCsvSeedQuery** function. 

The function will automatically clean the csv (e.g. removing spaces from headers), safe cast the values to the appropriate Type (**it will infer the type where not explicitly stated**) and clean quotations to ensure creation of a clean table 'seed'.

This means you can copy and paste data directly from a csv into the source .js file without having to mess around quoting each entry (the bigger the seed the more annoying this is!).

#### **`seeds/generateCSVSeedTables.js`**
``` js 
const seedNames = [
    {
        name: "example.js",
        description: "a clear concise descripton",
        headers: {
            name: 'STRING',
            colour: 'STRING',
            age: 'INT64'
        }
    }
];

seedNames.forEach(seedNames => {
		publish(seedNames.name, {
			type: "table",
			description: seedNames.description,
			schema: "reference",
			tags: ["seeds"]
		})
        .query(
            ctx => {
                let seedPath = "./" + seedNames.name;
                return `${functions.getCsvSeedQuery(require(seedPath), seedNames.headers ? seedNames.headers : 'None')}`
            }
        );
});
```
