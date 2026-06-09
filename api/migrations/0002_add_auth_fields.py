from django.db import migrations


def add_auth_fields(apps, schema_editor):
    pass


def remove_auth_fields(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_auth_fields, remove_auth_fields),
    ]
