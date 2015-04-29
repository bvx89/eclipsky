package no.hal.eclipsky.services.editor;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.core.runtime.NullProgressMonitor;

import no.hal.eclipsky.services.common.Proposal;
import no.hal.eclipsky.services.common.ResourceRef;
import no.hal.eclipsky.services.common.SourceFileMarker;

public interface SourceEditor {
	public ResourceRef getResourceRef();
	public CharSequence getSourceFileContents();
	public byte[] getResourceFileContents();
	public SourceFileMarker[] update(String stringContent, boolean markers, boolean commit);
	public Proposal[] complete(int pos);
	public void close(NullProgressMonitor monitor);
}
