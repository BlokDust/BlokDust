GOALS
=======

1. Create pipeline architecture.
2. Each engine pass should be its own pipe band. (Measure, Arrange, Size, Render)
3. Pipes
	* consists of sequence of tapins
	* assets will be injected
	* results object will be injected to be mutated by tapins
	* tapins should be configurable on a pipe
4. Tapins
	* should stand on own
	* should perform (only) 1 action