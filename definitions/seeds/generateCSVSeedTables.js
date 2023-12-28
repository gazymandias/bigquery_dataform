const seedNames = ["example"];

seedNames.forEach(seedNames => {
    publish(seedNames, {
        type: "table",
        schema: "reference",
        tags: ["seeds"]
    })
        .query(
            ctx => {
                let seedPath = "./" + seedNames + ".csv";
                return ${functions.csvToSqlSelect(require(seedPath))}
            }
        );
});