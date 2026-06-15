# Makefile - use `make` or `make help` to get a list of commands.
#
# Note - Comments inside this makefile should be made using a single
# hashtag `#`, lines with double hash-tags will be the messages that
# printed in the help command

# Name of the current directory
PROJECTNAME="admin-ui"


# Redirecting error output to a file, acts as logs that can
# be referenced if needed
STDERR=/tmp/$(PROJECTNAME)-stderr.txt


# Ensures firing a blank `make` command default to help
.DEFAULT_GOAL := help

# Make is verbose in Linux. Make it silent
MAKEFLAGS += --silent


.PHONY: help
## `help`: Generates this help dialog for the Makefile
help: Makefile
	echo
	echo " Commands available in \`"$(PROJECTNAME)"\`:"
	echo
	sed -n 's/^[ \t]*##//p' $< | column -t -s ':' |  sed -e 's/^//'
	echo



.PHONY: release-tag
## `release-tag`: Create a tag to trigger a release. (`make release-tag v=v0.1.0` for example)
release-tag:
	echo "  >  Creating release $(v)"
	git tag -a  $(v) -m "Release $(v)"
	git push origin $(v)

