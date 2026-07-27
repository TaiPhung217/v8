import cherrypy
import os
import os.path
import re

def chrome_version():
    ua = cherrypy.request.headers['User-Agent']
    match = re.search('Mozilla\/5\.0 \(X11; Linux x86_64\) AppleWebKit\/\d+\.\d+ \(KHTML, like Gecko\) Chrome\/(\d+\.\d+\.\d+\.\d+) Safari\/\d+\.\d+', ua)
    if match is not None:
        return match.group(1)
    match = re.search('Mozilla\/5\.0 \(Windows NT 10\.0; Win64; x64\) AppleWebKit\/\d+\.\d+ \(KHTML, like Gecko\) Chrome\/(\d+\.\d+\.\d+\.\d+) Safari\/\d+\.\d+', ua)
    if match is not None:
        return 'win_' + match.group(1)
    return ua

def chrome_version_path(path):
    return os.path.join('./', path)

class Server(object):
    def _cp_dispatch(self, vpath):
        path = os.path.join(*vpath)
        cherrypy.request.params['file'] = path
        for i in range(len(vpath)):
            vpath.pop()
        return self

    @cherrypy.expose()
    def index(self, file=None):
        version = chrome_version()
        if file is None:
            with open('1472121.html', 'r') as tmp:
                print("Serving:", version)
                return tmp.read()
        else:
            try:
                with open(chrome_version_path(file), 'r') as tmp:
                    return tmp.read()
            except FileNotFoundError:
                return f'<html><body><div>Could not find {chrome_version_path(file)}</div></body></html>'

cherrypy.config.update({
    'log.screen': False,
    'server.socket_port': 443,
    'server.socket_host':'0',
    'server.ssl_module' : 'builtin',
    'server.ssl_certificate' : 'cert.pem',
    'server.ssl_private_key' : 'privkey.pem'
    # 'server.socket_host':'192.168.173.1'
})
# https://cherrypydocrework.readthedocs.io/deploy.html#ssl-support
# https://googleprojectzero.blogspot.com/2019/04/virtually-unlimited-memory-escaping.html

cherrypy.tree.mount(Server(), '/')
cherrypy.engine.start()
cherrypy.engine.block()

