export class WorkspaceSync {
  constructor({read, save, snapshot, hydrate, status, fail, isEditing, initial}) {
    Object.assign(this, {read, save, snapshot, hydrate, status, fail, isEditing});
    this.version = initial.version;
    this.saved = JSON.stringify(initial.data);
    this.busy = false;
    this.stopped = false;
  }
  async tick() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      const draft = JSON.stringify(this.snapshot());
      if (draft !== this.saved) {
        this.status('Saving…');
        this.version = await this.save(this.version, JSON.parse(draft));
        this.saved = draft;
        this.status(JSON.stringify(this.snapshot()) === draft ? 'Saved' : 'Changes pending');
      } else if (!this.isEditing()) {
        const remote = await this.read();
        // Edits can occur while the network read is pending. Never replace them.
        if (JSON.stringify(this.snapshot()) !== this.saved) return;
        if (remote.version !== this.version) {
          this.hydrate(remote.data);
          this.saved = JSON.stringify(remote.data);
          this.version = remote.version;
        }
      }
    } catch (error) {
      this.stopped = true;
      this.status('Not saved');
      this.fail(error);
    } finally {
      this.busy = false;
    }
  }
  get pending() { return JSON.stringify(this.snapshot()) !== this.saved; }
}
