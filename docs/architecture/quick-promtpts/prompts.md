would you be able to set up the the dashboard/ page laoders and the modules/ setup so i can at least view each page. the use cases are not set up properly. use cases and api mutation routes for creates, update, delete ect. are out of scope. and we are scoped  
  to the import list + record view, inventory list + record view. so that includes the staged inventory rows in imports record view. and the cut logs section of inventory record view. the data and domain layers are mostly set up for these modules. the use cases  
  are still mid sweep id say. the modules/ directory per modules i mentioned is already structured correctly, it just needs to import the correct data now so the dashboard/ loader and load the page. inventory rows are now long part of the import record view,     
  iy s now the staged inventory section. for real, worker, relay topic, outbox, and api routes calling use cases are out of scope. i beleive we just need to add the get routes so we can load the pages, right ?      

  # Cut logs (out of scope but marks a major checkpoint once complete)
- Users update and save cut logs one at a time. Anything more than 1 update to a cut log per transaction will be handled by a worker. 
- Each edit to a cut log locks the parent inventory row
- Work order material items `assignedquantity` and `assignedcost` ARE IRRELEVANT AND OUT OF SCOPE - FUTURE USE.
- Cut logs link to material item and work order link may be null. But a cut log row must never be saveable with only one or the other.