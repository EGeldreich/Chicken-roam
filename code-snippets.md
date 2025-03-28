@if(auth.user)
<form action="{{ route('rename-plan', { id: plan.id}) }}" method="POST">
{{ csrfField() }}
<input type="text" name="newName" value="{{ plan.name }}" />
<button type="submit" class="btn btn-primary">Rename</button>
</form>
@end
