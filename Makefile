out := _out
all:

vendor.src := $(shell adieu -pe '$$("link,script").map((_,e) => $$(e).attr("href") || $$(e).attr("src")).get().filter(v => /node_modules/.test(v)).join`\n`' index.html)
vendor.dest := $(addprefix $(out)/, $(vendor.src))
static.dest := $(addprefix $(out)/, index.html main.js background.svg)

$(out)/%: %
	@mkdir -p $(dir $@)
	cp $< $@

all: $(vendor.dest) $(static.dest)



upload: all
	rsync -avPL --delete -e ssh $(out)/ gromnitsky@web.sourceforge.net:/home/user-web/gromnitsky/htdocs/js/springclock/
