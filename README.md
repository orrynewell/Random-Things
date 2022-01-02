# Random-Things
This location serves to capture unique issues I ran into in my workplace and collect some random projects. 

## Pandas Issue - Iterrows "Issue"
### Summary
I ran into a unique issue in a data transformation and metrics items a few weeks ago. Below is the summary of the issue, but the real lesson to be learned here is that I perscribed one of my data scientist to use an incorrect process to get the job done. To keep it short, I told them to use an itterow to assess each list against another list. If one item from the dataframe list was in the comparison list, then a value would be assigned elsewhere in the dataframe. 

Itterows operates by creating a copy of the dataframe and then providing an index and row object. The index appears to be correct on small scale example but when dealing with large datasets this index may not be accurate. So items are missed and this leads to an incorret end product. This is especially difficult to diagnose because of how the data is most likely correct at small scale. 

### Issue Specifics
The original data column contained a comma deliminated string of values. There were additional spaces and inconsistencies in the data. In order to fix this and convert it to a list the following operation was ran. 
```
df['column_name'] = df['column_name'].str.replace(" ", "").str.lower().str.split(',').toList()
```
This elimates all spaces, puts the strings in all lower case, and splits the string into a list separated by commas.

The next issue was how to access the list against another list. The base case is that if any value in the dataframes list is in the comparison list then a different column recieves a value. The below is how this was accomplished.

```
df.loc[df['list_column'].apply(lambda row_list: comparison_list in row_list), 'column_to_update] = 'value'
```
This got the project to done. This process was used in multiple ways throughout to get to success.

###Thoughts
This project really taught me the power of the pandas dataframes. The process time when using the iterrows process was around 1 hour. With replacing those processes with .loc(s) the processing time was reduced to just over 1 minute.
