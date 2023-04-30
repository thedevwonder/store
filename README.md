## Store Monitoring System

I have been given a set of data and based on the set, I have to generate CSV file report, calculating the data and possibly keeping it as close to real as possible.
If the data is missing, I have to interpolate the data and then generate the report.
___

### Approach

1. For calculating store uptime, I have used the intervals (last hour, last day, last week) and queried the results.
2. If the data is not present, we'll get empty results and hence, I have to interpolate

Suppose we have the store online ideal time, and the moments at which we monitor data comes out to be exactly the same as the ideal one, we can say that the data has probability of 1.
however out of 4 times that the store needs to be active, it is active only for 3 times, we can say the probability here is 3/4. Also the store timings may differ based on the day of the week.
Taking all of these into account, we calculate a mean probability that could help us extrapolate our data without making any complex assumptions.

3. find the probability of the store getting online by using above method.
4. Generate the report using json2csv parser and send a GET API link to the client which will directly download the csv on local system.


**Reference**

The overall system is very similar to Redash an open source tool, I have used in my current company and the inner workings of Redash are pretty much the same.
