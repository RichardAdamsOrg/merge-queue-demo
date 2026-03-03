This project is to demo aspects of merge queues for a live demo to engineering colleagues. I need to be able to create PRs easily and show the effects of changing merge queue configuration.



1. Simple, quickrunning Github actions for onMerge and onPr 
2. A command line script, written in javascipt or typescript that can create N branches, make a simple, identifying commit in each , then create a pull request for each branch. It's ok to use the Github CLI. 
3. Assume the github repo has branch protection rules that don't require revieer approval, but do require checks to pass, and don;t allow direct push to main.