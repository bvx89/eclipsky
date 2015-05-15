package no.hal.eclipsky.services.editor;

import java.util.ArrayList;
import java.util.List;

import no.hal.eclipsky.services.common.Test;

public class TestResult extends RunResult {
	private List<Test> allTests;
	
	
	public TestResult(String qualifiedName) {
		super(qualifiedName);
	}
	
	/**
	 * This method will parse the console output into a list of Test-Objects 
	 */
	@Override
	public void setConsoleOutput(String consoleOutput) {
		super.setConsoleOutput(consoleOutput);
		
		String[] lines = consoleOutput.split("\n");
		allTests = new ArrayList<Test>();		
		for (int i = 0; i < lines.length - 1; i++) {
			String line = lines[i].trim();
			if (! line.startsWith("*")) {
				continue;
			}
			String testName = lines[++i], exception = "";
			char status = lines[++i].charAt(0);
			while (i+1 < lines.length && ! lines[i+1].startsWith("*")) {
				if (exception.length() > 0) {
					exception += "\n";
				}
				exception += lines[++i];
			}
			Test t = new Test(testName, status, exception);			
			allTests.add(t);
		}
		
		// This will maintain the same order on the result for each test run
		allTests.sort((t1, t2) -> t1.getTestName().compareTo(t2.getTestName()));
	}

	public List<Test> getAllTests() {
		return allTests;
	}
}
