Work orders Main Section
- `Scheduled For` cell needs to be a calender date select not manual type, and the date currently shows with "000000z" at the end, it needs to be formatted properly, there should be a shared data helper somewhere.

- Property and warehouse dropdowns both have bugs, they both default to one of the available options, therefore when saved it errors saying "x id is required" even though it looks like one is linked, these 2 dropdowns need to start as no option selected.

- Property address doesnt have a value even when a property is selected. property address and instructions both dont appear. there needs to be a shared helper for this so templates can use it too. 