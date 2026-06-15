export class DemoResetController {
  public loading = false;
  public status: 'idle' | 'success' | 'error' = 'idle';
  public errorMessage = '';

  constructor(private onStateChange: () => void) {}

  async handleReset() {
    if (this.loading) return; // Prevent duplicate requests
    
    this.loading = true;
    this.status = 'idle';
    this.errorMessage = '';
    this.onStateChange();

    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data && data.error && data.error.message) || 'Failed to reset demo data');
      }
      this.status = 'success';
    } catch (err) {
      this.status = 'error';
      this.errorMessage = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      this.loading = false;
      this.onStateChange();
    }
  }
}
