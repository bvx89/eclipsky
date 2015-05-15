package no.hal.eclipsky.testing;

import java.io.PrintStream;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

import junit.framework.AssertionFailedError;
import junit.framework.Test;
import junit.framework.TestFailure;
import junit.framework.TestListener;
import junit.framework.TestResult;
import junit.runner.BaseTestRunner;

public class ResultPrinter implements TestListener {
	private static final String NEWLINE = System.getProperty("line.separator");
	private List<TestDescriptor> tests = new ArrayList<>();

    PrintStream fWriter;
    int fColumn = 0;

    public ResultPrinter(PrintStream writer) {
        fWriter = writer;
    }

    /* API for use by textui.TestRunner */

    synchronized void print(TestResult result, long runTime) {
    	for (TestDescriptor t : tests) {
    		getWriter().println('*');
    		getWriter().println(t.getTestName());
    		getWriter().println(t.getStatus());
    		if (t.getException() != null) {
    			getWriter().println(t.getException());
    		} else {
    			getWriter().println("No exception message");
    		}
    	}
    	getWriter().println('*');
    }

    void printWaitPrompt() {
        getWriter().println();
        getWriter().println("<RETURN> to continue");
    }

    /**
     * Returns the formatted string of the elapsed time.
     * Duplicated from BaseTestRunner. Fix it.
     */
    protected String elapsedTimeAsString(long runTime) {
        return NumberFormat.getInstance().format((double) runTime / 1000);
    }

    public PrintStream getWriter() {
        return fWriter;
    }

    private TestDescriptor currentTest;
    
    /**
     * @see junit.framework.TestListener#addError(Test, Throwable)
     */
    public void addError(Test test, Throwable e) {
    	currentTest.setStatus('E');
    	String exception = e.toString();
    	currentTest.setException(exception);
    }

    /**
     * @see junit.framework.TestListener#addFailure(Test, AssertionFailedError)
     */
    public void addFailure(Test test, AssertionFailedError t) {
    	currentTest.setStatus('F');
    	String exception = t.getLocalizedMessage();
    	currentTest.setException(exception);
    }

    /**
     * @see junit.framework.TestListener#endTest(Test)
     */
    public void endTest(Test test) {
    	//getWriter().println();
    }

    /**
     * @see junit.framework.TestListener#startTest(Test)
     */
    public void startTest(Test test) {
    	currentTest = new TestDescriptor(test.toString());
    	tests.add(currentTest);
    }

}
