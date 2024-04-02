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
